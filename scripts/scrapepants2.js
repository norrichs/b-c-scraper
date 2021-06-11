const puppeteer = require("puppeteer");
const fs = require("fs");

async function run() {
	const browser = await puppeteer.launch({
		headless: false,
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1200, height: 1200 });
	await page.goto("https://www2.hm.com/en_us/men/products/pants.html");

	// get past cookie consent modal
	const consentButton = await page.$(`#onetrust-accept-btn-handler`);
	await consentButton.click();

	const IMAGE_SELECTOR = "article.hm-product-item div a img:nth-of-type(1)";
	console.log("img selector", IMAGE_SELECTOR);
	let imageHref = await page.evaluate((sel) => {
		return document.querySelector(sel).getAttribute("src");
	}, IMAGE_SELECTOR);
	const imageURL = "https:" + imageHref;
	console.log('imgageURL', imageURL);

	var viewSource = await page.goto(imageURL);


	fs.writeFile("../../pants/pants1.jpg", await viewSource.buffer(), function (err) {
		if (err) {
			return console.log(err);
		}

		console.log("The file was saved!");
	});

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