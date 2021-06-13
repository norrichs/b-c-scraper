'use strict';

const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const fs = require('fs')

// Browser and page instance
async function instance(){
    const browser = await puppeteer.launch({
        headless: false
    })

    const page = await browser.newPage()
    return {page, browser}
}

// Extract all imageLinks from the page
async function extractImageLinks(){
    const {page, browser} = await instance()

    // Get the page url from the user
    let baseURL = process.argv[2] ? process.argv[2] : "https://www2.hm.com/en_us/men/products/pants.html"

    try {
        await page.goto(baseURL, {waitUntil: 'networkidle0'})
        await page.waitForSelector('body')

		// Get the cookies consent button and click through
		const consentButton = await page.$(`#onetrust-accept-btn-handler`);
		await consentButton.click();
		console.log('clicked consent')

		
		
        let imageLinks = await page.evaluate(() => {
			const IMAGE_SELECTOR = `li.product-item > article > div.image-container > a > img`
            let imgTags = Array.from(document.querySelectorAll(IMAGE_SELECTOR))
            let imageArray = []

            imgTags.map((image, index) => {

                let src = image.src
				let filename = index + image.getAttribute('title') + '.jpg'


                imageArray.push({
                    src,
                    filename
                })
            })

            return imageArray
        })
		console.log('imageLinks', imageLinks)
        await browser.close()
        return imageLinks

    } catch (err) {
        console.log(err)
    }
}

(async function(){
    console.log("Downloading images...")

    let imageLinks = await extractImageLinks()

    imageLinks.map((image) => {
        let filename = `../../images/pants/${image.filename}`
        saveImageToDisk(image.src, filename)
    })

    console.log("Download complete, check the images folder")
})()

function saveImageToDisk(url, filename){
    fetch(url)
    .then(res => {
        const dest = fs.createWriteStream(filename);
        res.body.pipe(dest)
    })
    .catch((err) => {
        console.log(err)
    })
}

// li.product-item > article > div.image-container > a > img