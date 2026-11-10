import { expect, type Page, test } from '@playwright/test';

// Mirrors src/app/about/slots/engine.ts.
const START_CREDITS = 41;
const FULL_MOONS = 75;
const COST = 5;

function watchForErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    // Network noise (an image the CMS could not serve) is not this test's business.
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text());
  });
  return errors;
}

test('the slot machine on /about plays itself in, then takes a pull and keeps its books', async ({ page }) => {
  // An opening pull, a full pull (a rocket launch runs about ten seconds) and a reload; WebKit is slower.
  test.setTimeout(90_000);
  const errors = watchForErrors(page);
  await page.goto('/about');
  const machine = page.getByTestId('slot-machine');
  const number = async (name: string) => Number(await machine.getAttribute(`data-${name}`));

  // Pin the machine. Keep nudging until the page has hydrated and noticed, as in home.spec.ts.
  await expect(async () => {
    await machine.evaluate((el) => el.parentElement?.scrollIntoView());
    await page.evaluate(() => window.scrollBy(0, 2));
    await expect(machine).toHaveAttribute('data-spins', '1', { timeout: 1000 });
  }).toPass();

  // A new visitor's opening pull is free and always lands three full moons.
  await expect(machine).toHaveAttribute('data-busy', 'false', { timeout: 15_000 });
  await expect(machine).toHaveAttribute('data-line', 'moon moon moon');
  expect(await number('credits')).toBe(START_CREDITS + FULL_MOONS);
  await expect(page.getByTestId('slot-credits')).toHaveAccessibleName(`${START_CREDITS + FULL_MOONS} credits`);

  // A real pull: whatever lands, the balance moves by exactly loan - cost + payout.
  const before = await number('credits');
  await page.getByTestId('slot-lever').click();
  await expect(machine).toHaveAttribute('data-spins', '2');
  await expect(machine).toHaveAttribute('data-busy', 'false', { timeout: 30_000 });
  const after = await number('credits');
  expect(await number('cost')).toBe(COST);
  expect(after).toBe(before + (await number('loan')) - COST + (await number('payout')));
  await expect(page.getByTestId('slot-stats')).toContainText('spins2');
  // Three rockets or 777 fill the moon, which makes the pull after it a free one.
  const moonFilled = ['launch', 'sevens'].includes((await machine.getAttribute('data-kind')) ?? '');

  // Coming back: the balance is restored, and arriving at the machine pulls nothing. Only a
  // new visitor's free opening plays itself; every other pull needs a hand on the lever.
  await page.reload();
  await expect(machine).toHaveAttribute('data-credits', String(after));
  await machine.evaluate((el) => el.parentElement?.scrollIntoView());
  await page.evaluate(() => window.scrollBy(0, 2));
  await page.waitForTimeout(1500);
  await expect(machine).toHaveAttribute('data-spins', '2');
  await expect(machine).toHaveAttribute('data-busy', 'false');

  await page.getByTestId('slot-lever').click();
  await expect(machine).toHaveAttribute('data-spins', '3');
  await expect(machine).toHaveAttribute('data-busy', 'false', { timeout: 30_000 });
  const cost = moonFilled ? 0 : COST;
  expect(await number('cost')).toBe(cost);
  expect(await number('credits')).toBe(after + (await number('loan')) - cost + (await number('payout')));

  expect(errors).toEqual([]);
});

test('a visitor who pulls the lever before the machine is pinned still gets shooting stars', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.clock.install();
  await page.goto('/about');
  const machine = page.getByTestId('slot-machine');
  const lever = page.getByTestId('slot-lever');

  // Bring the machine into view without pinning it, so the scroll never plays the first pull.
  await machine.evaluate((el) => {
    const top = (el.parentElement as HTMLElement).getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - window.innerHeight * 0.3);
  });
  await expect(machine).toHaveAttribute('data-spins', '0');
  await expect(async () => {
    await lever.click();
    await expect(machine).toHaveAttribute('data-spins', '1', { timeout: 1000 });
  }).toPass();
  await expect(machine).toHaveAttribute('data-busy', 'false', { timeout: 15_000 });

  // The first star is due 20 to 40 seconds after the first pull; it retries while the machine is busy.
  // The clock is fake but the star's CSS flight is real, so read its state rather than its visibility.
  const star = page.getByRole('button', { name: 'Catch the shooting star', includeHidden: true });
  await expect(star).toHaveAttribute('data-mode', 'hidden');
  await expect(async () => {
    await page.clock.fastForward(10_000);
    await expect(star).not.toHaveAttribute('data-mode', 'hidden', { timeout: 500 });
  }).toPass({ timeout: 30_000 });

  expect(errors).toEqual([]);
});
