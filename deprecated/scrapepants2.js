const puppeteer = require("puppeteer");
const fs = require("fs");
const { pathToFileURL } = require("url");

async function run() {
	const fetch = require('node-fetch')
	const browser = await puppeteer.launch({
		headless: false,
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1200, height: 1200 });
	await page.goto("https://www2.hm.com/en_us/men/products/pants.html");

	// get past cookie consent modal
	const consentButton = await page.$(`#onetrust-accept-btn-handler`);
	await consentButton.click();

	let max = 5;
	let savePath = "../../images/pants";
	let IMAGE_SELECTOR, imageHref, imageTitle, imageURL, viewSource, filePath;

	for (i = 2; i <= max; i++) {
		console.log("---------- i = ", i)
		IMAGE_SELECTOR = `#page-content > div > div:nth-child(4) > ul > li:nth-child(${i}) > article > div.image-container > a > img`
		
		console.log("--- image selector", IMAGE_SELECTOR);

		// Wait for selector
		await page.waitForSelector(IMAGE_SELECTOR)

		let imageHref = await page.evaluate((sel) => {
			return document.querySelector(sel).getAttribute("src");
		}, IMAGE_SELECTOR);
		console.log("--- imageHref", imageHref);
		
		imageTitle="model"
		// imageTitle = await page.evaluate((sel) => {
		// 	return document.querySelector(sel).getAttribute("title");
		// }, IMAGE_SELECTOR);
		// console.log("--- imageTitle", imageTitle);

		imageURL = "https:" + imageHref;
		filePath = `${savePath}/model_${imageTitle + i}.jpg`;
		console.log("file path", filePath);
// Use Fetch to get image
		
		let response = await fetch(imageURL);
		let buffer = await response.buffer();
		fs.writeFileSync(filePath,buffer,()=>console.log('finished downloading sync'))
		// fs.writeFile(filePath, buffer, () => console.log('finished downloading'))







// open new page to get image
		// viewSource = await page.goto(imageURL);
		// fs.writeFile(filePath, await viewSource.buffer(), function (err) {
		// 	if (err) {
		// 		return console.log("error on ", i, err);
		// 	}
		// });
		
		console.log("The file was saved!", i);
		page.goBack()
	}

	browser.close();
}

run();
/*

<img
	src="//lp2.hm.com/hmgoepprod?set=source[/69/cc/69cc7039bd9d7933c3a002b70afe70f269ea93b2.jpg],origin[dam],category[],type[LOOKBOOK],res[y],hmver[1]&amp;call=url[file:/product/main]"
	data-altimage="//lp2.hm.com/hmgoepprod?set=source[/b1/7a/b17a15c90122a1a1719b7d57071878bf8bd0ef18.jpg],origin[dam],category[],type[DESCRIPTIVESTILLLIFE],res[y],hmver[2]&amp;call=url[file:/product/main]"
	class="item-image"
	alt="Relaxed Fit PantsModel"
	data-alttext="Relaxed Fit Pants"
	data-src="//lp2.hm.com/hmgoepprod?set=source[/69/cc/69cc7039bd9d7933c3a002b70afe70f269ea93b2.jpg],origin[dam],category[],type[LOOKBOOK],res[m],hmver[1]&amp;call=url[file:/product/style]"
	title="Relaxed Fit PantsModel"
></img>;

*/

{/* <img
	src="//lp2.hm.com/hmgoepprod?set=source[/69/cc/69cc7039bd9d7933c3a002b70afe70f269ea93b2.jpg],origin[dam],category[],type[LOOKBOOK],res[y],hmver[1]&amp;call=url[file:/product/main]"
	data-altimage="//lp2.hm.com/hmgoepprod?set=source[/b1/7a/b17a15c90122a1a1719b7d57071878bf8bd0ef18.jpg],origin[dam],category[],type[DESCRIPTIVESTILLLIFE],res[m],hmver[2]&amp;call=url[file:/product/style]"
	class="item-image"
	alt="Relaxed Fit PantsModel"
	data-alttext="Relaxed Fit Pants"
	data-src="//lp2.hm.com/hmgoepprod?set=source[/69/cc/69cc7039bd9d7933c3a002b70afe70f269ea93b2.jpg],origin[dam],category[],type[LOOKBOOK],res[m],hmver[1]&amp;call=url[file:/product/style]"
	title="Relaxed Fit PantsModel"
></img>; */}

