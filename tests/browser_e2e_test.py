from __future__ import annotations

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import unittest

from playwright.sync_api import Browser, Page, Playwright, sync_playwright

DEMO = Path(__file__).resolve().parents[1]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None: del format, args

class BrowserE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(DEMO)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True); cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}/"
        cls.playwright: Playwright = sync_playwright().start(); cls.browser: Browser = cls.playwright.chromium.launch(headless=True)
    @classmethod
    def tearDownClass(cls) -> None:
        cls.browser.close(); cls.playwright.stop(); cls.server.shutdown(); cls.server.server_close(); cls.thread.join(timeout=5)
    def page(self, host: bool) -> tuple[Page, list[str]]:
        context = self.browser.new_context(); self.addCleanup(context.close); page = context.new_page(); page.set_default_timeout(5000); errors: list[str] = []
        page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
        page.add_init_script("""window.__lifecycle=[];addEventListener('explain-him:webmcp-lifecycle',(event)=>window.__lifecycle.push(event.detail))""")
        if host: page.add_init_script("""Object.defineProperty(document,'modelContext',{configurable:true,value:{async registerTool(tool){window.__tools ||= {};window.__tools[tool.name]=tool},async getTools(){return Object.values(window.__tools||{})}}})""")
        page.goto(self.base_url, wait_until="domcontentloaded"); return page, errors
    def diagram(self, term: str) -> dict:
        return {"type":"diagram","title":f"{term} workflow","variant":"flow","nodes":[{"id":term.lower(),"label":term},{"id":"agent","label":"Personal agent"}],"edges":[{"from":term.lower(),"to":"agent","label":"asks"}],"sources":[{"path":"resolutions/2026-08-30-user-consumer-terminology.md","status":"current"}]}
    def request(self, contract: dict, request_id: str, revision: int, operations: list[dict]) -> dict:
        return {"requestId": request_id, "expectedWorkspaceRevision": revision, "explanationId": contract["explanationId"], "topicId": "terminology:user-consumer", "operations": operations, "handshake": {"bootstrapTool": contract["bootstrapTool"], "contractId": contract["contractId"], "activationId": contract["activation"]["id"], "nonce": contract["activation"]["nonce"], "baseRevision": contract["baseRevision"], "skillProof": contract["skillProof"]}}
    def contrast(self, page: Page, foreground: str, background: str) -> float:
        return page.evaluate(r"""([foreground, background]) => {
          const rgba = (value) => { const values = value.match(/\d+(?:\.\d+)?/g).map(Number); return [values[0] / 255, values[1] / 255, values[2] / 255, values.length > 3 ? values[3] : 1]; };
          const composite = (foreground, background) => { const [r, g, b, alpha] = rgba(foreground); const [br, bg, bb] = rgba(background); return [r * alpha + br * (1 - alpha), g * alpha + bg * (1 - alpha), b * alpha + bb * (1 - alpha)]; };
          const linear = (channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
          const luminance = (foreground, background) => { const [r, g, b] = composite(foreground, background).map(linear); return .2126 * r + .7152 * g + .0722 * b; };
          const [a, b] = [luminance(foreground, background), luminance(background, 'rgb(255, 255, 255)')].sort((left, right) => right - left);
          return (a + .05) / (b + .05);
        }""", [foreground, background])
    def test_p0_user_consumer_replace_update_toggle_undo_and_reload(self) -> None:
        page, errors = self.page(True); page.wait_for_function("document.documentElement.dataset.webmcpState === 'verified'")
        self.assertEqual(sorted(page.evaluate("() => Object.keys(window.__tools)")), ["apply_explanation", "get_explain_him_answer"])
        contract = page.evaluate("() => window.__tools.get_explain_him_answer.execute({})")
        self.assertEqual(contract["schemaVersion"], "explain-him-webmcp-contract.v3")
        self.assertEqual(contract["workspaceRevision"], 0)
        self.assertTrue(contract["repository"]["url"].startswith("https://github.com/")); self.assertEqual(len(contract["skills"]), 2)
        self.assertEqual(page.locator("#webmcp-agent-status").text_content(), "Agent connection – observed")
        self.assertEqual(page.locator("#webmcp-contract-status").text_content(), "Contract – activated")
        page.evaluate("args => window.__tools.apply_explanation.execute(args)", self.request(contract, "p0-focus", contract["workspaceRevision"], [{"op":"focus","targetId":"flow-model"}]))
        self.assertTrue(page.locator('[data-eh-block-id="flow-model"]').evaluate("node => node.classList.contains('is-focused')"))
        authored = page.locator('[data-eh-block-id="workflow-diagram"]'); authored_before = authored.inner_text()
        result = page.evaluate("args => window.__tools.apply_explanation.execute(args)", self.request(contract, "p0-user-consumer", contract["workspaceRevision"], [{"op":"replace","targetId":"workflow-diagram","block":self.diagram("User")},{"op":"focus","targetId":"workflow-diagram"}]))
        self.assertEqual(result["workspaceRevision"], 1)
        local_id = result["localBlocks"][0]["id"]
        self.assertFalse(authored.is_visible())
        page.get_by_role("heading", name="User workflow").wait_for(state="visible")
        local = page.locator('[data-eh-local-slot="workflow-diagram"]'); self.assertIn("User", local.inner_text()); self.assertNotIn("Consumer", local.inner_text()); self.assertTrue(local.locator('.is-focused').is_visible()); self.assertEqual(page.locator('.is-focused').count(), 1)
        page.reload(wait_until="domcontentloaded"); self.assertTrue(page.get_by_role("heading", name="User workflow").is_visible())
        contract_after_reload = page.evaluate("() => window.__tools.get_explain_him_answer.execute({})")
        self.assertEqual(contract_after_reload["workspaceRevision"], 1)
        updated = page.evaluate("args => window.__tools.apply_explanation.execute(args)", self.request(contract_after_reload, "p0-user-consumer-update", contract_after_reload["workspaceRevision"], [{"op":"update","blockId":local_id,"block":self.diagram("Consumer")}]))
        self.assertEqual(updated["workspaceRevision"], 2)
        self.assertEqual(updated["localBlocks"][0]["id"], local_id)
        self.assertIn("Consumer", local.inner_text()); self.assertNotIn("User", local.inner_text())
        self.assertEqual(page.locator("#webmcp-revision-status").text_content(), "Personalized UI updated – workspace revision 2")
        failure_count = page.evaluate("() => window.__lifecycle.filter(event => event.type === 'apply-succeeded').length")
        with self.assertRaises(Exception):
            page.evaluate("args => window.__tools.apply_explanation.execute(args)", self.request(contract_after_reload, "p0-stale", 0, [{"op":"remove","blockId":local_id}]))
        self.assertEqual(page.locator("#webmcp-revision-status").text_content(), "Personalized UI update failed – workspace revision 2")
        self.assertEqual(page.evaluate("() => window.__lifecycle.filter(event => event.type === 'apply-succeeded').length"), failure_count)
        self.assertNotIn(contract_after_reload["activation"]["nonce"], page.evaluate("() => JSON.stringify(window.__lifecycle)"))
        menu = page.locator("summary.menu-toggle"); menu.focus(); page.keyboard.press("Enter"); page.get_by_role("group", name="Explanation view").wait_for(state="visible")
        page.get_by_role("button", name="Original", exact=True).click(); authored.wait_for(state="visible")
        page.get_by_role("button", name="Personalized", exact=True).click(); page.get_by_role("heading", name="Consumer workflow").wait_for(state="visible")
        page.locator("#developer-details summary").click()
        page.get_by_role("button", name="Open operation log", exact=True).click(); self.assertEqual(page.evaluate("() => document.activeElement.id"), "history-close"); page.get_by_role("button", name="Close", exact=True).click(); self.assertEqual(page.evaluate("() => document.activeElement.id"), "workspace-history-open")
        removed = page.evaluate("args => window.__tools.apply_explanation.execute(args)", self.request(contract_after_reload, "p0-user-consumer-remove", updated["workspaceRevision"], [{"op":"remove","blockId":local_id}]))
        self.assertEqual(removed["workspaceRevision"], 3)
        authored.wait_for(state="visible"); self.assertEqual(authored.inner_text(), authored_before)
        self.assertEqual(errors, [])
    def test_hostless_chrome_fallback_is_honest_and_accessible(self) -> None:
        page, errors = self.page(False); status = page.locator("#webmcp-status-hero").text_content(); self.assertIn("unavailable", status); self.assertIn("accessible browser controls remain available", status)
        self.assertEqual(page.locator("#webmcp-page-status").text_content(), "Page WebMCP API – unavailable")
        self.assertEqual(page.locator("#webmcp-agent-status").text_content(), "Agent connection – not observed")
        page.locator("#developer-details summary").click()
        page.get_by_role("textbox", name="Title").fill("Fallback E2E"); page.get_by_role("textbox", name="Explanation").fill("Accessible local fallback.")
        page.get_by_role("button", name="Apply test block", exact=True).click(); page.get_by_role("heading", name="Fallback E2E").wait_for(state="visible")
        self.assertEqual(errors, [])

    def test_continuous_navigation_status_contrast_and_reduced_motion(self) -> None:
        page, errors = self.page(False)
        section_links = page.locator("[data-scroll-section]"); self.assertEqual(section_links.count(), 2)
        self.assertEqual(page.locator(".explanation-scroll > section[data-continuous-section]").count(), 2)
        self.assertEqual(page.locator('[role="tablist"], [role="tab"], [role="tabpanel"], [data-section-panel]').count(), 0)
        self.assertEqual(page.locator("h1").count(), 1)
        self.assertEqual(page.locator("h1").inner_text(), "Express your idea once. Explain Him explains it to everyone.")
        self.assertEqual(page.locator(".action-step:visible").count(), 6)
        self.assertNotIn("Local explanation", page.content())
        self.assertNotIn("Who does what", page.content())
        self.assertNotIn("Three roles", page.content())
        details = page.locator("#developer-details"); self.assertIsNone(details.get_attribute("open")); self.assertFalse(page.locator("#webmcp-status").is_visible())
        self.assertEqual(page.get_by_role("button", name="Add", exact=True).count(), 0)
        summary = details.locator("summary"); summary.focus(); page.keyboard.press("Enter"); self.assertIsNotNone(details.get_attribute("open"))
        developer_text = details.inner_text()
        for expected in ["Protocol v3", "get_explain_him_answer", "apply_explanation", "2/2 page status", "Operation log", "IndexedDB", "Visible DOM", "Browser fallback", "source path, status, and optional ref"]:
            self.assertIn(expected, developer_text)
        express = page.get_by_role("link", name="How to express your idea", exact=True); express.click()
        self.assertEqual(page.evaluate("() => document.activeElement.id"), "how-to-express"); self.assertEqual(express.get_attribute("aria-current"), "location")
        works = page.get_by_role("link", name="How it works", exact=True); self.assertIsNone(works.get_attribute("aria-current")); works.click(); self.assertEqual(page.evaluate("() => document.activeElement.id"), "how-it-works")
        self.assertTrue(page.get_by_role("heading", name="Ask your agent how to express your own idea with Explain Him.").is_visible())
        status = page.locator("#webmcp-status"); self.assertEqual(status.get_attribute("role"), "status"); self.assertEqual(status.get_attribute("aria-live"), "polite"); self.assertEqual(status.get_attribute("aria-atomic"), "true"); self.assertIsNone(page.locator("#webmcp-status-hero").get_attribute("role"))
        body_colors = page.locator("body").evaluate("node => { const style = getComputedStyle(node); return [style.color, style.backgroundColor]; }")
        current_colors = page.locator(".status-current").evaluate("node => { const style = getComputedStyle(node); return [style.color, style.backgroundColor]; }")
        button_colors = page.locator(".primary-action").first.evaluate("node => { const style = getComputedStyle(node); return [style.color, style.backgroundColor]; }")
        self.assertGreaterEqual(self.contrast(page, *body_colors), 4.5); self.assertGreaterEqual(self.contrast(page, *current_colors), 4.5); self.assertGreaterEqual(self.contrast(page, *button_colors), 4.5)
        works.focus(); focus_color = works.evaluate("node => getComputedStyle(node).outlineColor"); self.assertGreaterEqual(self.contrast(page, focus_color, "rgb(248, 249, 251)"), 3)
        for selector in ["#agent-title", "#agent-target", "summary.menu-toggle"]:
            colors = page.locator(selector).evaluate("node => { const style=getComputedStyle(node); return [style.borderTopColor, style.backgroundColor]; }")
            self.assertGreaterEqual(self.contrast(page, *colors), 3, selector)
        primary_colors = page.locator(".primary-action").first.evaluate("node => { const style=getComputedStyle(node); return [style.color, style.backgroundColor]; }")
        self.assertGreaterEqual(self.contrast(page, *primary_colors), 4.5, ".primary-action text")
        page.locator("#agent-title").focus(); input_focus = page.locator("#agent-title").evaluate("node => getComputedStyle(node).outlineColor")
        self.assertGreaterEqual(self.contrast(page, input_focus, "rgb(255, 255, 255)"), 3)
        page.locator("summary.menu-toggle").click(); page.get_by_role("button", name="Original", exact=True).wait_for(state="visible")
        for selector in ["[data-workspace-view='original']", "#workspace-history-open", "#source-toggle"]:
            colors = page.locator(selector).evaluate("node => { const style=getComputedStyle(node); return [style.borderTopColor, style.backgroundColor]; }")
            self.assertGreaterEqual(self.contrast(page, *colors), 3, selector)
        page.get_by_role("button", name="Open operation log", exact=True).click(); dialog_close = page.locator("#history-close").evaluate("node => { const style=getComputedStyle(node); return [style.borderTopColor, style.backgroundColor]; }")
        self.assertGreaterEqual(self.contrast(page, *dialog_close), 3); page.get_by_role("button", name="Close", exact=True).click()
        page.get_by_role("button", name="Sources", exact=True).click(); self.assertEqual(page.evaluate("() => document.activeElement.id"), "source-close")
        drawer = page.locator("#source-drawer"); self.assertEqual(drawer.get_attribute("role"), "region"); self.assertEqual(page.get_by_role("button", name="Sources", exact=True).get_attribute("aria-controls"), "source-drawer")
        drawer_close = page.locator("#source-close").evaluate("node => { const style=getComputedStyle(node); return [style.borderTopColor, style.backgroundColor]; }")
        self.assertGreaterEqual(self.contrast(page, *drawer_close), 3); page.keyboard.press("Escape"); self.assertTrue(drawer.is_hidden()); self.assertEqual(page.evaluate("() => document.activeElement.id"), "source-toggle")
        self.assertLessEqual(float(page.locator("#workspace-undo").evaluate("node => getComputedStyle(node).opacity")), .5)
        page.set_viewport_size({"width": 375, "height": 812}); self.assertLessEqual(page.evaluate("() => document.documentElement.scrollWidth"), 375)
        page.emulate_media(reduced_motion="reduce"); duration = page.locator(".continuous-section").first.evaluate("node => getComputedStyle(node).animationDuration"); self.assertLessEqual(float(duration.removesuffix("ms")) / 1000 if duration.endswith("ms") else float(duration.removesuffix("s")), .00001)
        self.assertEqual(errors, [])

if __name__ == "__main__": unittest.main()
