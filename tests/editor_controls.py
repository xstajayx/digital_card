"""Helpers for retained advanced controls after the creator simplification."""
def advanced(page):
 page.locator('.extras').evaluate('e=>e.open=true')
def drafts(page):
 page.locator('.draft-menu').evaluate('e=>e.open=true')
def legacy(page):
 """Explicitly exercise the retained standard renderer, never change new defaults."""
 page.locator('.steps [data-step="4"]').click();advanced(page)
 page.locator('#physicalToggle').uncheck();page.locator('#opening-type').select_option('theme')
 page.locator('.steps [data-step="1"]').click()
def font(page,value):
 page.locator(f'.font-choice[data-font="{value}"]').click()
