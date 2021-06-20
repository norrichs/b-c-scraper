	//*	Script Description
{

	///////////////////////////////////////////////////////////
	//*	Script Description
	//*		Inputs: array of product_family objects as json
	//*				array of detail_page objects as json
	//*		Sequentially accesses product families, uses key info to lookup associated
	//*		detail_page info, including link
	//*		opens page, scrapes data, writes to an individual product family json file
	//*		See accessory script to collate data into seedData file or files
	//*
	//*		Data to scrape: 
		// {
		// 	"audience": { "S": "women" },
		// 	"product_category": { "S": "accessories" },
		// 	"product_group": { "S": "belts" },
		// 	"product_family": { "S": "Knot-detail Waist Belt" },
		//TODO 	"price": { "N": "45.95" },
		//TODO 	"price_sale": { "N": "55" },
		// 	"altText": {
		// 		"L": [
		// 			{ "S": "Knot-detail Waist BeltModel" },
		// 			{ "S": "Knot-detail Waist Belt" }
		// 		]
		// 	},
		//TODO 	"swatchColors": { "L": [] },    // do from group page
		//TODO 	"images": {
		// 		"L": [
		// 			{
		// 				"S": "women_accessories_belts_Knot-detail-Waist-Belt_00.jpg"
		// 			},
		// 			{ "S": "women_accessories_belts_Knot-detail-Waist-Belt_01.jpg" }
		// 		]
		// 	},
		//  	"sizes": { "L": [] },
		//TODO 	"items": { "L": [] },
		// 	"a_c": { "S": "women_accessories" },
		// 	"g_f": { "S": "belts_Knot-detail-Waist-Belt" }
		//TODO ------------new-----------------
		//todo  composition:
		//todo	style-with: []
		//todo	also-bought: []
		//  copy-desc: S, // todo copy-list: [{title: S, data: S}]
	
		// }
		//TODO ------------new-----------------
		//todo 	separate reviews objects
		//
}
// IMPORT 
"use strict";
const puppeteer = require('puppeteer');
// const fetch = require("node-fetch")
const fs = require("fs")
const families = require('../../data/seed_data/seedData.json')
// GLOBALS
const baseURL = "https://www2.hm.com"
const detail_pages_dir = '../../data/detail-pages'
const detail_seedData_dir = '../../data/detail-seed/'
const limit = 50;
const doHeadless = true
// 


//* //////////////////////////
//* Looping Function
//* //////////////////////////
const loopDetailPages = async () => {
	const { page, browser } = await instance();
	// Loop familes
	for(let i=0; i<families.length; i++){
		let f = families[i]
		// console.log(i,f)
		const dList = require(`${detail_pages_dir}/${f.audience.S}_${f.product_category.S}_${f.product_group.S}_links.json`)
		
		// don't loop over array. Filter for the right match
		const matchedDetail = dList.filter((d)=> d.product_family === f.product_family.S)
		let dURL = baseURL + matchedDetail[0].url
		console.log(dURL)
		const detailData = await scrapeDetailPage(dURL, f, page)
		const filename = `${f.a_c.S}_${f.g_f.S}.json`
		console.log(`[${i}]- saving detail data `, filename)
		storeData(detailData, detail_seedData_dir + filename)

	}
	browser.close()
}

//* //////////////////////////
//* Scrape Page Function
//* //////////////////////////
const scrapeDetailPage = async (dURL, f, page) => {
	/*
	Navigage to page at dURL
	Wait
	Enter evaluate context
	Query selectors and get data, adding to object
	
	*/
	// Watcher for evaluate context logs
	// page.on("console", (msg) => {
	// 	for (let i = 0; i < msg.args().length; ++i)
	// 		console.log(`${i}: ${msg.args()[i]}`);
	// 	});
	try{
		await page.goto(dURL, {waitUntil: "networkidle0", timeout: 0})
		await page.waitForSelector("body")
		
		const resF = await page.evaluate((f)=>{
			resF = {...f}
			// Copy
			resF.copy_desc = {S: document.querySelector('p.pdp-description-text').innerText}
			// resF.copy_list = document.querySelector('div.pdp-description-list-item')
			resF.testSize = { L: 
				Array.from(document.querySelectorAll('div.picker-option')).map((pickerDiv,i)=>{
					return {S: pickerDiv.querySelector('span.value').innerText}
				}).splice(1)
			}

			resF.copy_list = { L: [] }
			Array.from(document.querySelectorAll('div.pdp-description-list-item')).forEach((item)=>{
				resF.copy_list.L.push({
					title: {S: item.querySelector('dt').innerText},
					copy: {S: item.querySelector('dd').innerText}
				})
			})



			// Grab hm image urls.  These will be replace w/ properly formatted dynamoJSON referencing downloaded images
			resF.hmImages = []
			resF.hmImages.push(document.querySelector('div.product-detail-main-image-container').querySelector('img').getAttribute('src'))
			Array.from(document.querySelectorAll('img.product-detail-thumbnail-image')).forEach((img)=>{
				resF.hmImages.push(img.getAttribute('src'))
			})
			// push to resF.hmStyleThumbs
			resF.hmStyleThumbs = []
			Array.from(document.querySelector('div.mini-slider').querySelectorAll('li.list-item')).forEach((li)=>{
				resF.hmStyleThumbs.push(li.querySelector('img').getAttribute('src'))
			})

			return resF
		}, f)
		return resF
	}catch(err){
		console.error('scrape detail page error', err)
	}
}

//* //////////////////////////
//* Init puppeteer function
//* //////////////////////////
async function instance() {
	const browser = await puppeteer.launch({
		headless: doHeadless,
	});
	
	const page = await browser.newPage();
	page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4512.0 Safari/537.36")
	//   Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/92.0.4512.0 Safari/537.36
	const agentString = await browser.userAgent()
	console.log('USER AGENT', agentString)
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
//* //////////////////////////
//* Save Data Function
//* //////////////////////////
const storeData = (data, path) => {
	try{
		fs.writeFileSync(path, JSON.stringify(data))
		console.log(`Wrote JSON to ${path}`)
	}catch(err){
		console.log("JSON savefile error:",err)
	}
}

loopDetailPages()