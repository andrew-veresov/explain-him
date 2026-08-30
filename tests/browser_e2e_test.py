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
        if host: page.add_init_script("""Object.defineProperty(document,'modelContext',{configurable:true,value:{async registerTool(tool){window.__tools ||= {};window.__tools[tool.name]=tool},async getTools(){return Object.values(window.__tools||{})}}})""")
        page.goto(self.base_url, wait_until="domcontentloaded"); return page, errors
    def diagram(self, term: str) -> dict:
        return {"type":"diagram","title":f"{term} workflow","variant":"flow","nodes":[{"id":term.lower(),"label":term},{"id":"agent","label":"Personal agent"}],"edges":[{"from":term.lower(),"to":"agent","label":"asks"}],"sources":[{"path":"resolutions/2026-08-30-user-consumer-terminology.md","status":"current"}]}
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
        self.assertEqual(sorted(page.evaluate("() => Object.keys(window.__tools)")), ["apply_explanation", "get_explanation_contract"])
        contract = page.evaluate("() => window.__tools.get_explanation_contract.execute({})")
        self.assertEqual(contract["schemaVersion"], "explain-him-webmcp-contract.v2")
        self.assertTrue(contract["repository"]["url"].startswith("https://github.com/")); self.assertEqual(len(contract["skills"]), 2)
        page.evaluate("() => window.__tools.apply_explanation.execute({operations:[{op:'focus',targetId:'flow-model'}]})")
        self.assertTrue(page.locator('[data-eh-block-id="flow-model"]').evaluate("node => node.classList.contains('is-focused')"))
        authored = page.locator('[data-eh-block-id="workflow-diagram"]'); authored_before = authored.inner_text()
        result = page.evaluate("""block => window.__tools.apply_explanation.execute({requestId:'p0-user-consumer',expectedWorkspaceRevision:0,operations:[{op:'replace',targetId:'workflow-diagram',block},{op:'focus',targetId:'workflow-diagram'}]})""", self.diagram("User"))
        local_id = result["localBlocks"][0]["id"]
        self.assertFalse(authored.is_visible())
        page.get_by_role("heading", name="User workflow").wait_for(state="visible")
        local = page.locator('[data-eh-local-slot="workflow-diagram"]'); self.assertIn("User", local.inner_text()); self.assertNotIn("Consumer", local.inner_text()); self.assertTrue(local.locator('.is-focused').is_visible()); self.assertEqual(page.locator('.is-focused').count(), 1)
        updated = page.evaluate("""args => window.__tools.apply_explanation.execute({expectedWorkspaceRevision:args.revision,operations:[{op:'update',blockId:args.id,block:args.block}]})""", {"revision":result["workspaceRevision"],"id":local_id,"block":self.diagram("Consumer")})
        self.assertEqual(updated["localBlocks"][0]["id"], local_id)
        self.assertIn("Consumer", local.inner_text()); self.assertNotIn("User", local.inner_text())
        menu = page.locator("summary.menu-toggle"); menu.focus(); page.keyboard.press("Enter"); page.get_by_role("group", name="Explanation view").wait_for(state="visible")
        page.get_by_role("button", name="Original", exact=True).click(); authored.wait_for(state="visible")
        page.get_by_role("button", name="Personalized", exact=True).click(); page.get_by_role("heading", name="Consumer workflow").wait_for(state="visible")
        page.get_by_role("button", name="History", exact=True).click(); self.assertEqual(page.evaluate("() => document.activeElement.id"), "history-close"); page.get_by_role("button", name="Close", exact=True).click(); self.assertEqual(page.evaluate("() => document.activeElement.id"), "workspace-history-open")
        page.reload(wait_until="domcontentloaded"); self.assertTrue(page.get_by_role("heading", name="Consumer workflow").is_visible())
        page.evaluate("""args => window.__tools.get_explanation_contract.execute({}).then(() => window.__tools.apply_explanation.execute({expectedWorkspaceRevision:args.revision,operations:[{op:'remove',blockId:args.id}]}))""", {"revision":updated["workspaceRevision"],"id":local_id})
        authored.wait_for(state="visible"); self.assertEqual(authored.inner_text(), authored_before)
        self.assertEqual(errors, [])
    def test_hostless_chrome_fallback_is_honest_and_accessible(self) -> None:
        page, errors = self.page(False); status = page.locator("#webmcp-status-hero").inner_text(); self.assertIn("WebMCP host not detected", status); self.assertIn("no Site Tools mutation was performed", status)
        page.get_by_role("tab", name="Adaptation", exact=True).click(); page.get_by_role("textbox", name="Title").fill("Fallback E2E"); page.get_by_role("textbox", name="Explanation").fill("Accessible local fallback.")
        page.get_by_role("button", name="Add", exact=True).click(); page.get_by_role("heading", name="Fallback E2E").wait_for(state="visible")
        self.assertEqual(errors, [])

    def test_tabs_status_contrast_and_reduced_motion(self) -> None:
        page, errors = self.page(False)
        tabs = page.get_by_role("tab"); self.assertEqual(tabs.count(), 4)
        self.assertEqual(page.get_by_role("tablist", name="Explanation sections").count(), 1)
        flow = page.get_by_role("tab", name="Mechanism"); flow.focus(); page.keyboard.press("ArrowRight")
        roles = page.get_by_role("tab", name="Roles"); self.assertEqual(page.evaluate("() => document.activeElement.id"), "tab-roles"); self.assertEqual(roles.get_attribute("aria-selected"), "true")
        self.assertTrue(page.get_by_role("tabpanel", name="Roles").is_visible()); page.keyboard.press("End"); self.assertEqual(page.evaluate("() => document.activeElement.id"), "tab-grounding")
        status = page.locator("#webmcp-status"); self.assertEqual(status.get_attribute("role"), "status"); self.assertEqual(status.get_attribute("aria-live"), "polite"); self.assertIsNone(page.locator("#webmcp-status-hero").get_attribute("role"))
        body_colors = page.locator("body").evaluate("node => { const style = getComputedStyle(node); return [style.color, style.backgroundColor]; }")
        current_colors = page.locator(".status-current").evaluate("node => { const style = getComputedStyle(node); return [style.color, style.backgroundColor]; }")
        button_colors = page.locator(".primary-action").evaluate("node => { const style = getComputedStyle(node); return [style.color, style.backgroundColor]; }")
        self.assertGreaterEqual(self.contrast(page, *body_colors), 4.5); self.assertGreaterEqual(self.contrast(page, *current_colors), 4.5); self.assertGreaterEqual(self.contrast(page, *button_colors), 4.5)
        flow.focus(); focus_color = flow.evaluate("node => getComputedStyle(node).outlineColor"); self.assertGreaterEqual(self.contrast(page, focus_color, "rgb(248, 249, 251)"), 3)
        page.get_by_role("tab", name="Adaptation", exact=True).click()
        for selector in ["#agent-title", "#agent-target", "summary.menu-toggle"]:
            colors = page.locator(selector).evaluate("node => { const style=getComputedStyle(node); return [style.borderTopColor, style.backgroundColor]; }")
            self.assertGreaterEqual(self.contrast(page, *colors), 3, selector)
        primary_colors = page.locator(".primary-action").evaluate("node => { const style=getComputedStyle(node); return [style.color, style.backgroundColor]; }")
        self.assertGreaterEqual(self.contrast(page, *primary_colors), 4.5, ".primary-action text")
        page.locator("#agent-title").focus(); input_focus = page.locator("#agent-title").evaluate("node => getComputedStyle(node).outlineColor")
        self.assertGreaterEqual(self.contrast(page, input_focus, "rgb(255, 255, 255)"), 3)
        page.locator("summary.menu-toggle").click(); page.get_by_role("button", name="Original", exact=True).wait_for(state="visible")
        for selector in ["[data-workspace-view='original']", "#workspace-history-open", "#source-toggle"]:
            colors = page.locator(selector).evaluate("node => { const style=getComputedStyle(node); return [style.borderTopColor, style.backgroundColor]; }")
            self.assertGreaterEqual(self.contrast(page, *colors), 3, selector)
        page.get_by_role("button", name="History", exact=True).click(); dialog_close = page.locator("#history-close").evaluate("node => { const style=getComputedStyle(node); return [style.borderTopColor, style.backgroundColor]; }")
        self.assertGreaterEqual(self.contrast(page, *dialog_close), 3); page.get_by_role("button", name="Close", exact=True).click()
        page.get_by_role("button", name="Sources", exact=True).click(); self.assertEqual(page.evaluate("() => document.activeElement.id"), "source-close")
        drawer = page.locator("#source-drawer"); self.assertEqual(drawer.get_attribute("role"), "region"); self.assertEqual(page.get_by_role("button", name="Sources", exact=True).get_attribute("aria-controls"), "source-drawer")
        drawer_close = page.locator("#source-close").evaluate("node => { const style=getComputedStyle(node); return [style.borderTopColor, style.backgroundColor]; }")
        self.assertGreaterEqual(self.contrast(page, *drawer_close), 3); page.keyboard.press("Escape"); self.assertTrue(drawer.is_hidden()); self.assertEqual(page.evaluate("() => document.activeElement.id"), "source-toggle")
        self.assertLessEqual(float(page.locator("#workspace-undo").evaluate("node => getComputedStyle(node).opacity")), .5)
        page.emulate_media(reduced_motion="reduce"); duration = page.locator(".explanation-section").first.evaluate("node => getComputedStyle(node).animationDuration"); self.assertLessEqual(float(duration.removesuffix("ms")) / 1000 if duration.endswith("ms") else float(duration.removesuffix("s")), .00001)
        self.assertEqual(errors, [])

if __name__ == "__main__": unittest.main()
