import axios from 'axios';
import * as cheerio from 'cheerio';

// Function to get the last page number from the given link
export async function getLastPage(link: string): Promise<number> {
    try {
        const response = await axios.get(link);
        const $ = cheerio.load(response.data);

        // Select the second-to-last .page-number>ul>li>a element
        const lastPageLink = $('.page-number ul li a').eq(-2).attr('href');

        if (!lastPageLink) {
            throw new Error('Could not find the last page link');
        }

        // Extract the page number from the href attribute
        const lastPageMatch = lastPageLink.match(/page=(\d+)/);

        if (lastPageMatch && lastPageMatch[1]) {
            return parseInt(lastPageMatch[1], 10);
        } else {
            throw new Error('Could not extract the page number from the link');
        }
    } catch (error) {
        console.error('Error getting the last page:', error);
        throw error;
    }
}

// Function to get document links from a given page
export async function getDocLinksFromPage(link: string): Promise<string[]> {
    try {
        const response = await axios.get(link);
        const $ = cheerio.load(response.data);

        // Replace this selector with the actual selector for document links
        const docLinks: string[] = [];

        // Assuming document links are in <a> tags with a class 'doc-link'
        $('a.doc-link').each((index, element) => {
            const href = $(element).attr('href');
            if (href) {
                docLinks.push(href);
            }
        });

        return docLinks;
    } catch (error) {
        console.error('Error getting document links:', error);
        throw error;
    }
}
