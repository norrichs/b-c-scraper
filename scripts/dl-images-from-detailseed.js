const fs = require("fs")
const fetch = require("node-fetch")
const detailSeedDir = "../../data/detail-seed/"
const imageSaveDir = "../../images/detail/"


///////////////////////////////////////////////////////////////////////
// * Looper function
//		Sequentially read individual seed json per family
//		loop through hmxxxx arrays, 
//			fetch images and save
//			rewrite arrays in dynamoJSON w/ new filenames
//		Collate later			
///////////////////////////////////////////////////////////////////////

const loopDetailSeed = async () => {
	const sourceManifest = fs.readdirSync(detailSeedDir).map((filename) => detailSeedDir + filename)
	console.log(sourceManifest)
	sourceManifest.forEach( async (file) => {
		try{
			const {hmImages, hmStyleThumbs, ...p} = await JSON.parse(fs.readFileSync(file, 'utf8'))
			p.detail_images = { L: [] }
			p.thumb_images = { L: [] }

			const fnBase = `${p.a_c.S}_${p.g_f.S}`
			
			console.log(p.a_c.S + "_" + p.g_f.S + "___" + hmImages.length)
			hmImages.forEach((img, i)=>{
				p.detail_images.L.push({S: `${imageSaveDir}${fnBase}-dp${i}.jpg`})	
				saveImageToDisk('https:' + img, `${imageSaveDir}${fnBase}-dp${i}.jpg`, i)
			})
			hmStyleThumbs.forEach((img, i)=>{
				p.thumb_images.L.push({S: `${imageSaveDir}${fnBase}-dp${i}.jpg`})	
				saveImageToDisk('https:' + img, `${imageSaveDir}${fnBase}-dp${i}.jpg`, i)
			})
			// Write new data to file
			// console.log("revised seed", p)
			storeData(p, detailSeedDir + file)
		}catch(err){
			console.error(err)
		}
	})
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

loopDetailSeed()



/*

ran through women_tops_vest_Printed-Tank-Top-dp3.jpg




*/

