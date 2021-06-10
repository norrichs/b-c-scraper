const puppeteer = require('puppeteer');




(async () => {
  const browser = await puppeteer.launch({headless:false});
  const page = await browser.newPage();
  const acceptButtonId = 'onetrust-accept-btn-handler';
  await page.goto('https://www2.hm.com/en_us/men/products/pants.html');
  const consentButton = await page.$(`#${acceptButtonId}`)	
  console.log("got consent button?", consentButton)
  await consentButton.click()
  // await page.waitForNavigation()
  // console.log("navigation complete?")
  await page.screenshot({ path: 'example.png' });
  console.log("captured screenshot?")

  //



  //await browser.close();
})();

