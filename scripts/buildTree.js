// Global variables and imports
"use strict";
require('events').EventEmitter.prototype.setMaxListeners(100)
const listeners = require('events').EventEmitter.prototype.getMaxListeners()
console.log('listeners =' + listeners)
const puppeteer = require("puppeteer");
const fetch = require("node-fetch");
const fs = require("fs");

const imageFolderPath = '../images/'
const baseURL = "https://www2.hm.com"
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



const hmProductTreeExample = [
	{ 
		audience: "women",
		link: "/en_us/women.html",
		label: "Women",
		categories: [
			{
				category: "dresses",
				link: "/en_us/women/products/dresses.html",
				label: "Dresses",
				groups: [
					{
						group: "t-shirt-dresses",
						link: "en_us/women/products/dresses/t-shirt-dresses.html",
						label: "T-Shirt dresses"
					},
					{
						group: "denim",
						link: "en_us/women/products/dresses/denim.html",
						label: "Denim Dresses"
					},
					{
						group: "short-dresses",
						link: "en_us/women/products/dresses/short-dresses.html",
						label: "Short dresses"
					}
				]
			},
			{
				category: "tops",
				link: "/en_us/women/products/tops.html",
				label: "Tops",
				groups: [
					{
						group: "vest",
						link: "/en_us/women/products/tops/vest.html",
						label: "Sleeveless",
					},
					{
						group: "short-sleeve",
						link: "/en_us/women/products/tops/short-sleeve.html",
						label: "Short Sleeve",
					}
				]
			}
		]
	},
	{
		audience: "men",
		link: "/en_us/men.html",
		label: "Men",
		categories: [
			{
				category: "jeans",
				link: "/en_us/men/products/jeans.html",
				label: "Jeans",
				groups: [
					{
						group: "skinny",
						link: "/en_us/men/products/jeans/skinny.html",
						label: "Skinny"
					}
				]
			}
		]
	}
]

const scrapeAudience = async (audienceURL) => {
	const {page, browser} = await instance()

	page.on("console", (msg) => {
		for (let i = 0; i < msg.args().length; ++i)
			console.log(`${i}: ${msg.args()[i]}`);
	});

	try{
		console.log(baseURL + audienceURL)
		await page.goto(baseURL + audienceURL, {waitUntil: "networkidle0"})
		await page.waitForSelector("strong.is-opened")
		let audienceTree = await page.evaluate((baseURL, audienceURL)=>{
			let audienceTree = {
				audience: null,
				link: audienceURL,
				label: null,
				categories:[]
			}
			audienceTree.audience = audienceURL.substring(7,audienceURL.length-5)
			audienceTree.label = `${audienceTree.audience[0].toUpperCase()}${audienceTree.audience.substring(1)}`
			
		// * Get category list elements
			let audienceHeader = document.getElementsByClassName('is-opened')[0]
			let categoryList = audienceHeader.nextElementSibling.children
			audienceTree.categories = Array.from(categoryList).map((catLI)=>{
				// Get category data from this page
				let categoryLink =  catLI.firstElementChild.getAttribute('href')
				let routeArr = categoryLink.split('/')
				let route = routeArr[routeArr.length - 1]
				route = route.substring(0,route.length-5)
				let labelText = catLI.firstElementChild.innerText
				// console.log('route', route)
				let categoryTree = {
					category: route,
					link: categoryLink,
					label: labelText,
					groups: []
				}
				// Return a partial category tree, to be filled in by following links
				return categoryTree
			})
			return audienceTree
		}, baseURL, audienceURL)
	// * End of evaluate context
	// * Return the audience tree with incomplete categories
		browser.close()
		return audienceTree
	}catch (err){
		console.log('error', err)
	}
}

const scrapeCategory = async (categoryURL, page) => {
	//* page function below watches for console.log() within the page.evaluate() context
	// page.on("console", (msg) => {
	// 	for (let i = 0; i < msg.args().length; ++i)
	// 		console.log(`${i}: ${msg.args()[i]}`);
	// });

	try{
		console.log("scrape category URL: " + baseURL + categoryURL)
		await page.goto(baseURL + categoryURL, {waitUntil: "networkidle0"})
		await page.waitForSelector("a.current")

		const groupList = await page.evaluate((baseURL, categoryURL)=>{
			const sbpULTag = document.querySelector('strong.is-opened').nextElementSibling
			const categoryULTag = sbpULTag.querySelector('li.list-group').querySelector('ul.menu')
			const groupAnchorTags = categoryULTag.querySelectorAll('a')
			const groupList = Array.from(groupAnchorTags).map(a => {
				const group = {
					group: null,
					link: a.getAttribute('href'),
					label: a.innerText,
					families: []
				}
				group.group = group.link.split('/').pop().slice(0,-5)
			
				return group
			})
			return groupList
		}, baseURL, categoryURL)
		// console.log('groupList' + groupList.join('---'))
		return groupList
	}catch(err){
		console.log('scrape Category error', err)
	}
}

const buildTree = async () => {
	
	const audienceURLs = [ "/en_us/women.html", "/en_us/men.html", "/en_us/divided.html", "/en_us/baby.html", "/en_us/kids.html" ]
	// const audienceURLs = ["/en_us/women.html"]


	Promise.all(audienceURLs.map((audienceURL)=>{
		let audienceTree = scrapeAudience(audienceURL)

		return audienceTree
	})).then(async audiences=>{
		console.log("resolved audienceTree promises",audiences)
		for(let audience of audiences){
			console.log('audience: ' + audience.audience)

			const {page, browser} = await instance()
			for(let category of audience.categories){
				// console.log('category: ' + category.link + "-> scrape")
				category.groups = await scrapeCategory(category.link, page)
				console.log('scraped groups', category.groups)
			}
			browser.close();

		}
		storeData(audiences,'./manifestTree.json')
	})

}

buildTree()



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