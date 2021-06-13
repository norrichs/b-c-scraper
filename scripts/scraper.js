"use strict";

const puppeteer = require("puppeteer");
const fetch = require("node-fetch");
const fs = require("fs");
const { join } = require("path");
const {testProductList, productList} = require('./productList.js')
const imageFolderPath = '../images/'
// Browser and page instance
async function instance() {
	const browser = await puppeteer.launch({
		headless: false,
	});

	const page = await browser.newPage();
	// * INTERCEPT AND PREVENT IMAGE LOADING
	// await page.setRequestInterception(true);
	// page.on("request", (req) => {
	// 	if (req.resourceType() === "image") {
	// 		req.abort();
	// 	} else {
	// 		req.continue();
	// 	}
	// });
	return { page, browser };
}
///////////////////////////////////////////////////////////////////////
// * Function to extract image links and data from a product group page
// @params p | product object: {audience: String, category: String, group: String}
///////////////////////////////////////////////////////////////////////
async function extractImageLinks(p) {
	const { page, browser } = await instance();

	// File Name prefix - construct from relevant dynamoDB partition-key
	// const audience = "women";
	// const category = "swimwear";
	// const group = "bikini-sets";
	// let p = {
	// 	audience: "women",
	// 	category: "swimwear",
	// 	group: "bikini-sets",
	// 	family: null,
	// };

	const fileNamePrefix = `${p.audience}_${p.category}_${p.group}`;

	page.on("console", (msg) => {
		for (let i = 0; i < msg.args().length; ++i)
			console.log(`${i}: ${msg.args()[i]}`);
	});

	try {
		const baseURL = await initLoadSite(page, p);
		await page.goto(baseURL, { waitUntil: "networkidle0" });
		await page.waitForSelector("body");

		let {imageArray, productDataArray} = await page.evaluate((fileNamePrefix) => {
			let imageArray = [];
			let productDataArray = []
			let collection = document.getElementsByClassName("item-link"); // * See if this is too general
			collection.forEach((elem, index) => {
				let src0 =
					"https:" + elem.children[0].attributes["data-src"].value;
				let src1 =
					"https:" +
					elem.children[0].attributes["data-altimage"].value;
				let alt0 = elem.children[0].attributes["alt"].value;
				let alt1 = elem.children[0].attributes["data-alttext"].value;
				let title = alt1.replace(/ /g, "-");
				console.log("extracted image title: " + title);
				let fileName0 = fileNamePrefix + "_" + title + "_00.jpg";
				let fileName1 = fileNamePrefix + "_" + title + "_01.jpg";

				imageArray.push({ src: src0, filename: fileName0 });
				imageArray.push({ src: src1, filename: fileName1 });
				productDataArray.push({
					images: [fileName0, fileName1],
					altText: [alt0, alt1],
					price_sale: 55, 				// TODO change from dummy data to scraped data
					price: 45.95,					// TODO change from dummy data to scraped data
					audience: "men",				// TODO change from dummy data to scraped data
					product_category: "jeans",		// TODO change from dummy data to scraped data
					product_group: "skinny",		// TODO change from dummy data to scraped data
					product_family: "trashed",		// TODO change from dummy data to scraped data
					items: [0],						// TODO change from dummy data to scraped data
					sizes: []						// TODO change from dummy data to scraped data
				})
			});
			return {imageArray, productDataArray} //{imageArray, productDataArray};
		}, fileNamePrefix);

		
		console.log("productData", productDataArray)
		// console.log("imageLinks", imageLinks);

		await browser.close();
		return {imageArray, productDataArray};
	} catch (err) {
		console.log(err);
	}
}
///////////////////////////////////////////////////////////////////////
// * Function to scrape a product_group page
// @params p | product object: {audience: String, category: String, group: String}
///////////////////////////////////////////////////////////////////////
const scrapeProductPage = async (p) => {
	console.log("Downloading images...");

	// Open up a page, load all items, return link, filename, and text data
	let {imageArray, productDataArray} = await extractImageLinks(p);
	// console.log("raw image links", rawImageLinks)

	// Remove all the duplicate records from the results array
	let uniqeImageArray = removeDuplicates(imageArray, "filename");
	// console.log("unique image links", imageLinks)

	// Loop over unique array, save images to disk
	uniqeImageArray.forEach((image, index) => {
		// console.log("imageLinks image:",image)
		let filename = imageFolderPath + image.filename;
		saveImageToDisk(image.src, filename, index);
	});

	// Save product data as json
	storeData(productDataArray,`../data/${p.audience}_${p.category}_${p.group}.json`)


	console.log("Download complete, check the images folder");
	return "complete"
};
///////////////////////////////////////////////////////////////////////
// * Function to save productData to file system
///////////////////////////////////////////////////////////////////////
const storeData = (data, path) => {
	try{
		fs.writeFileSync(path, JSON.stringify(data))
		console.log(`Wrote JSON to ${path}`)
	}catch(err){
		console.log("JSON savefile error:",err)
	}
}

///////////////////////////////////////////////////////////////////////
// * Function to save an image to file system
///////////////////////////////////////////////////////////////////////
const saveImageToDisk = (url, filename, n) => {
	fetch(url)
		.then((res) => {
			const dest = fs.createWriteStream(filename);
			res.body.pipe(dest);
			// console.log(n,"-fetched and wrote to: ", filename)
		})
		.catch((err) => {
			console.log(err);
		});
}

///////////////////////////////////////////////////////////////////////
// * Function to load an initial product page, extract url for fully-
// * 	loaded version, construct a new URL
///////////////////////////////////////////////////////////////////////
const initLoadSite = async (page, p) => {
	page.on("console", (msg) => {
		for (let i = 0; i < msg.args().length; ++i)
		console.log(`${i}: ${msg.args()[i]}`);
	});

	// Initial URL
	const initialURL = `https://www2.hm.com/en_us/${p.audience}/products/${p.category}/${p.group}.html`;
	await page.goto(initialURL, { waitUntil: "networkidle0" });
	await page.waitForSelector("h2.load-more-heading");

	// Deal With Cookie Consent Button  // TODO make this conditional if first time...
	const consentButton = await page.$(`#onetrust-accept-btn-handler`);
	await consentButton.click();
	console.log("clicked consent");
	
	// Extract total items count
	const totalItems = parseInt(
		await page.evaluate(() =>
			document
				.getElementsByClassName("load-more-heading")[0]
				.getAttribute("data-total")
		)
	);
	
	// Fully loaded URL
	const loadedURL = `https://www2.hm.com/en_us/${p.audience}/products/${p.category}/${p.group}.html?offset=0&page-size=${totalItems}`;
	console.log(`For total items=${totalItems}, using URL: ${loadedURL}`)

	return loadedURL
}


// Removes duplicates from array of objects
// @param arr | array of objects
// @param key | key in objects which will be tested for uniqueness
const removeDuplicates = (arr, key) => {
	return [...new Set(arr.map((obj) => obj[key]))].map((uniqueKey) => {
		return arr.find((obj) => {
			return obj[key] === uniqueKey;
		});
	});
};

const scrapeHM = async (productList) => {
	console.log("Scraping H & M...")
	let pCount = productList.length

	// pCount=3 // Override for single product debugging

	for(let i = 0; i < pCount; i++){
		console.log(`product ${i}:`, productList[i])
		let scrapeStatus = await scrapeProductPage(productList[i])
		console.log(`prouduct${i} - ${scrapeStatus}`)

	}	
}

scrapeHM(testProductList)