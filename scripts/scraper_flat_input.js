// Global variables and imports
"use strict";

const puppeteer = require("puppeteer");
const fetch = require("node-fetch");
const fs = require("fs");
const {testProductList, productList} = require('./productList.js');
const imageFolderPath = '../images/'
const productPageLinkArray = []
const getImages = true
const getData = true
const useTest = true


///////////////////////////////////////////////////////////////////////
// * Initialize puppeteer Browser and page instance
// * set image request interception behavior
///////////////////////////////////////////////////////////////////////
async function instance() {
	const browser = await puppeteer.launch({
		headless: false,
	});

	const page = await browser.newPage();
	// * INTERCEPT AND PREVENT IMAGE LOADING
	await page.setRequestInterception(true);
	page.on("request", (req) => {
		if (req.resourceType() === "image") {
			req.abort();
		} else {
			req.continue();
		}
	});
	return { page, browser };
}
///////////////////////////////////////////////////////////////////////
// * Function to extract image links and data from a product group page
// @params p | product object: {audience: String, category: String, group: String}
///////////////////////////////////////////////////////////////////////
async function extractImageLinks(p) {
	const { page, browser } = await instance();
	const fileNamePrefix = `${p.audience}_${p.category}_${p.group}`;

	page.on("console", (msg) => {
		for (let i = 0; i < msg.args().length; ++i)
			console.log(`${i}: ${msg.args()[i]}`);
	});

	try {
		const baseURL = await initLoadSite(page, p);
		await page.goto(baseURL, { waitUntil: "networkidle0" });
		await page.waitForSelector("body");

		let {imageArray, productDataArray, productPageLinkArray} = await page.evaluate((fileNamePrefix, p) => {
			let imageArray = [];
			let productDataArray = []
			let productPageLinkArray = []
			const imageSelector  = 'li.product-item > article.hm-product-item > div.image-container > a.item-link > img.item-image'
			
			// Get Nodelist of all Items on page
			let collection = document.getElementsByClassName("hm-product-item"); // * See if this is too general


			// TODO add scrape of color swatch color values
			// TODO improve collection selector specificity
			// TODO add child selectors for: price, sale price, hmLink

			collection.forEach((itemArticle, index) => {
				let itemImage = itemArticle.children[0].children[0].children[0]
				let src0 = "https:" + itemImage.attributes["data-src"].value;
				let src1 = "https:" + itemImage.attributes["data-altimage"].value;
				let alt0 = itemImage.attributes["alt"].value;
				let alt1 = itemImage.attributes["data-alttext"].value;
				let title = alt1.replace(/ /g, "-").replace(/\//g, "-");
				console.log("extracted image title: " + title);
				let fileName0 = fileNamePrefix + "_" + title + "_00.jpg";		// TODO sanitize for React routes target
				let fileName1 = fileNamePrefix + "_" + title + "_01.jpg";		// TODO sanitize for React routes target
				let product_family_URL = itemArticle.getElementsByClassName('item-link')[0].getAttribute('href')

				imageArray.push({ src: src0, filename: fileName0 });
				imageArray.push({ src: src1, filename: fileName1 });
				productDataArray.push({
					a_c_g: `${p.audience}_${p.category}_${p.group}`,		// TODO sanitize for React routes target
					images: [fileName0, fileName1],
					altText: [alt0, alt1],
					price_sale: 55, 				// TODO change from dummy data to scraped data
					price: 45.95,					// TODO change from dummy data to scraped data
					audience: p.audience,			
					product_category: p.category,	
					product_group: p.group,			
					product_family: alt1,			// TODO change from dummy data to scraped data
					items: [],						// TODO change from dummy data to scraped data
					sizes: [],
					swatchColors: []						// TODO change from dummy data to scraped data
				})
				productPageLinkArray.push({
					a_c_g: `${p.audience}_${p.category}_${p.group}`,		// TODO sanitize for React routes target
					product_family: alt1, 
					url: product_family_URL})
			});
			return {imageArray, productDataArray, productPageLinkArray} //{imageArray, productDataArray};
		}, fileNamePrefix, p);

		
		// console.log("productData", productDataArray)
		// console.log("imageArray", imageArray);
		// console.log(productPageLinkArray)

		await browser.close();
		return {imageArray, productDataArray, productPageLinkArray};
	} catch (err) {
		console.log(err);
	}
}
///////////////////////////////////////////////////////////////////////
// * Function to scrape a product_group page
// @params p | product object: {audience: String, category: String, group: String}
///////////////////////////////////////////////////////////////////////
const scrapeProductGroupPage = async (p) => {
	console.log("Downloading images...", p)
	// Open up a page, load all items, return link, filename, and text data
	let {imageArray, productDataArray, productPageLinkArray} = await extractImageLinks(p);
	// console.log("raw image links", rawImageLinks)

	// Remove all the duplicate records from the results array
	let uniqeImageArray = removeDuplicates(imageArray, "filename");
	let uniqueDataArray = removeDuplicates(productDataArray, "product_family")
	let uniqueProductPages = removeDuplicates(productPageLinkArray, "product_family")
	// console.log("unique image links", imageLinks)

	// Loop over unique array, save images to disk
	uniqeImageArray.forEach((image, index) => {
		// console.log("imageLinks image:",image)
		let filename = imageFolderPath + image.filename;  // TODO sanitize for React routes target in extractImageLinks
		saveImageToDisk(image.src, filename, index);
	});

	// Save product data as json
	storeData(uniqueDataArray,`../data/product_family_data/${p.audience}_${p.category}_${p.group}.json`)		// TODO sanitize for React routes target
	storeData(uniqueProductPages, `../data/detail-pages/${p.audience}_${p.category}_${p.group}_links.json`)		// TODO sanitize for React routes target


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
			console.log(n,"-fetched and wrote to: ", filename)
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

	// * Initial URL
	// TODO - Deal with kid and baby routes  - remove gender
	// TODO - Deal with compound categories or groups - combine them w/ hyphen
	// let initialURL;
	// if(p.audience.slice(0,4) === 'kids'){
	// 	initialURL = `https://www2.hm.com/en_us/${p.audience}/${p.category}/${p.group}.html`
	// }else if(p.audience.slice(0,4) === 'baby'){
	// 	initialURL = `https://www2.hm.com/en_us/${p.audience}/${p.category}/${p.group}.html`
	// }else{
	let initialURL = `https://www2.hm.com/en_us/${p.audience}/products/${p.category}/${p.group}.html`; 
	// }
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
	const loadedURL = `${initialURL}?offset=0&page-size=${totalItems}`;

	console.log(`For total items=${totalItems}, using URL: ${loadedURL}`)

	return loadedURL
}

///////////////////////////////////////////////////////////////////////
// * Function to remove duplicates from array of objects
// @param arr | array of objects
// @param key | key in objects which will be tested for uniqueness
///////////////////////////////////////////////////////////////////////
const removeDuplicates = (arr, key) => {
	return [...new Set(arr.map((obj) => obj[key]))].map((uniqueKey) => {
		return arr.find((obj) => {
			return obj[key] === uniqueKey;
		});
	});
};
///////////////////////////////////////////////////////////////////////
// * Main function get list of products to scrape, loop over and 
//		call scrape function
///////////////////////////////////////////////////////////////////////
const scrapeHM = async (productList) => {
	console.log("Scraping H & M...")
	let pCount = productList.length

	// pCount=3 // Override for single product debugging

	for(let i = 0; i < pCount; i++){
		console.log(`product ${i}:`, productList[i])
		let scrapeStatus = await scrapeProductGroupPage(productList[i])
		console.log(`prouduct${i} - ${scrapeStatus}`)

	}	
}



scrapeHM(useTest ? testProductList : productList)