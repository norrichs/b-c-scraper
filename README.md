# B&C Scraper
In setting out to implement a clone of the H & M eCommerce site, it became clear that a proper data-set was going to be necessary to simulate the look and feel of the site.
The challenge was to acquire a significant set of aesthetically consistent product photographs, as well as site copy, product data and organization.  Any manual approach would dramatically limit the size of the data set due to the time and tedious effort required.  
A web-scraping approach was utilized, and the [Puppeteer](https://github.com/puppeteer/puppeteer) library was chosen as the main tool.

### Organization
The H & M site is organized in a hierarchy I have denoted as follows:
1. Audience - e.g. Men, Women, Kids, etc
2. Product Category - e.g. Pants, Shirts, Shoes, etc
3. Product Group - e.g.  Dress pants, casual pants, sports pants, etc
4. Product Family - Specific products for sale, e.g. Linen dress pants
5. Product Styles - Specific styles of a Product Family - e.g. Blue, Red, Striped, etc.

This regular organizational pattern allows for a top-down scraping strategy

### Scraping components
Web scraping with a series of sequential scripts, orchestrated via the scraper.js script
1. Scrape menu - recursively traverse the H&M product nav menu, collecting URLs in a nexted JSON format
2. Scrape product group pages - traverse the menu data at 'product group' level, sequentially navigating to product group pages.  These are assessed for completeness, secondary navigation "loads all" items.  Sequentially traverse the DOM, extracting certain product data and image URLs storing in JSON data files.  At this stage, duplicates are discarded.
3. Scrape product detail pages - traverse product group data, navigating to individual product pages.  Traverse the DOM, extrating detailed product data and image URLS
4. Fetch images and reformat data - traverse collected data, fetching and logically naming images.  Add retrieved image file data to product data, and reformat all data for seeding of database
5. Upload - data files are used to populate the backend database.  Images are synced with online data storage.  Menu data is used to dynamically generate site navigation menus, so that all data stores and references are synced without any manual intervention. 

