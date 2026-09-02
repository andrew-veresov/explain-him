from __future__ import annotations

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import unittest

from playwright.sync_api import Browser, Page, Playwright, sync_playwright

PUBLIC = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        del format, args


class BrowserE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(PUBLIC)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}/"
        cls.playwright: Playwright = sync_playwright().start()
        cls.browser: Browser = cls.playwright.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)

    def page(self, host: bool, native_skill: bool = False, debug: bool = False) -> tuple[Page, list[str]]:
        context = self.browser.new_context()
        self.addCleanup(context.close)
        page = context.new_page()
        errors: list[str] = []
        page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
        page.add_init_script("""window.__scrollCalls=[];Element.prototype.scrollIntoView=function(options){window.__scrollCalls.push(options)}""")
        if host:
            native_method = "async registerSkill(skill){window.__skills ||= {};window.__skills[skill.name]=skill}," if native_skill else ""
            page.add_init_script(f"""Object.defineProperty(document,'modelContext',{{configurable:true,value:{{async registerTool(tool){{window.__tools ||= {{}};window.__tools[tool.name]=tool}},{native_method}async getTools(){{return Object.values(window.__tools||{{}})}}}}}})""")
        page.goto(self.base_url + ("?webmcp-debug=1" if debug else ""), wait_until="domcontentloaded")
        return page, errors

    @staticmethod
    def diagram(term: str) -> dict:
        return {
            "type": "diagram", "title": f"{term} workflow", "variant": "flow",
            "nodes": [{"id": term.lower(), "label": term}, {"id": "agent", "label": "Personal agent"}],
            "edges": [{"from": term.lower(), "to": "agent", "label": "asks"}],
            "sources": [{"path": "PRODUCT-CONTRACT.md", "status": "current"}],
        }

    @staticmethod
    def request(request_id: str, decision: str, operations: list[dict], primary: int | None = None) -> dict:
        result = {
            "requestId": request_id, "topicId": "terminology:user-consumer",
            "decision": decision, "operations": operations,
        }
        if primary is not None:
            result["primaryOperationIndex"] = primary
        return result

    def test_protocol_v5_direct_focus_mutate_update_restore_and_reload(self) -> None:
        page, errors = self.page(True, debug=True)
        page.wait_for_function("document.documentElement.dataset.webmcpState === 'verified'")
        self.assertEqual(page.evaluate("() => Object.keys(window.__tools)"), ["explain_tool"])
        self.assertEqual(page.locator("#webmcp-page-status").text_content(), "Page WebMCP API – 1/1 tools registered")

        focused = page.evaluate("args => window.__tools.explain_tool.execute(args)", self.request("focus-existing", "existing", [{"op": "focus", "targetId": "flow-model"}]))
        self.assertEqual(focused["protocolVersion"], 5)
        self.assertFalse(focused["changed"])
        self.assertEqual(focused["workspaceRevision"], 0)
        self.assertEqual(page.evaluate("() => document.activeElement.dataset.ehBlockId"), "flow-model")
        self.assertEqual(page.locator(".is-focused").count(), 1)
        self.assertIn("Existing explanation focused", page.locator("#workspace-focus-status").text_content())

        authored = page.locator('[data-eh-block-id="workflow-diagram"]')
        authored_before = authored.inner_text()
        created = page.evaluate("args => window.__tools.explain_tool.execute(args)", self.request("replace-user", "inconsistent", [{"op": "replace", "targetId": "workflow-diagram", "block": self.diagram("User")}]))
        block_id = created["applied"][0]["blockId"]
        self.assertEqual(created["workspaceRevision"], 1)
        self.assertEqual(created["focused"]["blockId"], block_id)
        local = page.locator(f'[data-eh-local-block-id="{block_id}"]')
        self.assertTrue(local.is_visible())
        self.assertEqual(page.evaluate("() => document.activeElement.dataset.ehLocalBlockId"), block_id)
        self.assertFalse(authored.is_visible())
        self.assertEqual(page.locator(".is-focused").count(), 1)

        page.reload(wait_until="domcontentloaded")
        page.wait_for_function("document.documentElement.dataset.webmcpState === 'verified'")
        local = page.locator(f'[data-eh-local-block-id="{block_id}"]')
        self.assertTrue(local.is_visible())
        updated = page.evaluate("args => window.__tools.explain_tool.execute(args)", self.request("update-consumer", "partial", [{"op": "update", "blockId": block_id, "block": self.diagram("Consumer")}]))
        self.assertEqual(updated["workspaceRevisionBefore"], 1)
        self.assertEqual(updated["workspaceRevision"], 2)
        self.assertEqual(updated["applied"][0]["blockId"], block_id)
        self.assertIn("Consumer", local.inner_text())

        with self.assertRaises(Exception):
            page.evaluate("args => window.__tools.explain_tool.execute(args)", {**self.request("removed-handshake", "restore", [{"op": "remove", "blockId": block_id}]), "expectedWorkspaceRevision": 0})
        self.assertTrue(local.is_visible())

        restored = page.evaluate("args => window.__tools.explain_tool.execute(args)", self.request("restore", "restore", [{"op": "remove", "blockId": block_id}]))
        self.assertEqual(restored["workspaceRevision"], 3)
        self.assertTrue(authored.is_visible())
        self.assertEqual(authored.inner_text(), authored_before)
        self.assertEqual(page.evaluate("() => document.activeElement.dataset.ehBlockId"), "workflow-diagram")
        self.assertEqual(errors, [])

    def test_focus_only_target_is_rejected_without_invisible_persistence(self) -> None:
        page, errors = self.page(True)
        page.wait_for_function("document.documentElement.dataset.webmcpState === 'verified'")
        with self.assertRaises(Exception):
            page.evaluate("args => window.__tools.explain_tool.execute(args)", self.request("invisible-add", "missing", [{"op": "add", "targetId": "action-user", "block": {"type": "callout", "title": "No slot", "body": "Must not persist"}}]))
        self.assertEqual(page.locator('[data-eh-local-block-id]').count(), 0)
        self.assertEqual(errors, [])

    def test_reduced_motion_uses_auto_scroll(self) -> None:
        page, errors = self.page(True)
        page.emulate_media(reduced_motion="reduce")
        page.wait_for_function("document.documentElement.dataset.webmcpState === 'verified'")
        page.evaluate("args => window.__tools.explain_tool.execute(args)", self.request("reduced-focus", "existing", [{"op": "focus", "targetId": "grounding-contract"}]))
        self.assertEqual(page.evaluate("() => window.__scrollCalls.at(-1).behavior"), "auto")
        self.assertEqual(errors, [])

    def test_hostless_page_is_honest_and_accessible(self) -> None:
        page, errors = self.page(False)
        self.assertEqual(page.locator("#webmcp-page-status").text_content(), "Page WebMCP API – unavailable")
        status = page.locator("#webmcp-status")
        self.assertEqual(status.get_attribute("role"), "status")
        self.assertEqual(status.get_attribute("aria-live"), "polite")
        self.assertEqual(page.locator("#workspace-focus-status").get_attribute("aria-live"), "polite")
        self.assertEqual(page.locator('[data-webmcp-test-card]').count(), 0)
        self.assertEqual(errors, [])

    def test_issue_161_registers_one_skill_without_changing_tool_surface(self) -> None:
        page, errors = self.page(True, native_skill=True, debug=True)
        page.wait_for_function("document.documentElement.dataset.webmcpNativeSkillState === 'registered'")
        self.assertEqual(page.evaluate("() => Object.keys(window.__tools)"), ["explain_tool"])
        self.assertEqual(page.evaluate("() => Object.keys(window.__skills)"), ["explain_him"])
        self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
