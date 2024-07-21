import axios from 'axios';
import * as cheerio from 'cheerio';
import { LinkPage } from './LinkPage';

class TaiLieuDieuKyRepository {
    public formatPageNumber(page: number): string {
        return page < 10 ? `0${page}` : `${page}`;
    }

    public isEbookLink(link: string): boolean {
        return link.includes('/ebook/');
    }

    public isArticleLink(link: string): boolean {
        return link.includes('/baiviet/');
    }

    public getNextEbookLink(link: string, next: number): string {
        const formattedNext = this.formatPageNumber(next);
        return link.replace(/page=\d+/, `page=${formattedNext}`);
    }

    public async getLastPage(link: string): Promise<number> {
        try {
            const response = await axios.get(link);
            const $ = cheerio.load(response.data);

            if (this.isEbookLink(link)) {
                const lastPageLink = $('.page-number ul li a').eq(-2).attr('href');
                if (!lastPageLink) return 1;

                const lastPageMatch = lastPageLink.match(/page=(\d+)/);
                if (lastPageMatch && lastPageMatch[1]) {
                    return parseInt(lastPageMatch[1], 10);
                } else {
                    throw new Error('Could not extract the page number from the link');
                }
            } else if (this.isArticleLink(link)) {
                if ($('a.next.page-numbers').length) {
                    const lastPageLink = $('a.next.page-numbers').prev('a.page-numbers').attr('href');
                    const lastPageText = $('a.next.page-numbers').prev('a.page-numbers').text();
                    if (lastPageLink && lastPageText) {
                        return parseInt(lastPageText, 10);
                    } else {
                        throw new Error('Could not extract the last page number from the link');
                    }
                } else {
                    return 1;
                }
            } else {
                throw new Error('Unknown link type');
            }
        } catch (error) {
            console.error('Error getting the last page:', error);
            throw error;
        }
    }

    public async getEbookLinks(link: string, page: number): Promise<string[]> {
        try {
            const pageLink = this.getNextEbookLink(link, page);
            const response = await axios.get(pageLink);
            const $ = cheerio.load(response.data);

            const ebookLinks: string[] = [];
            $('p.download-box > a').each((index, element) => {
                const href = $(element).attr('href');
                if (href) {
                    ebookLinks.push(href);
                }
            });

            return ebookLinks;
        } catch (error) {
            console.error('Error getting ebook links:', error);
            throw error;
        }
    }

    public async getArticleLinks(link: string, page: number): Promise<string[]> {
        try {
            const response = await axios.get(link);
            const $ = cheerio.load(response.data);

            const articleLinks: string[] = [];
            $('.pagelayer-wposts-featured > a').each((index, element) => {
                const href = $(element).attr('href');
                if (href) {
                    articleLinks.push(href);
                }
            });

            return articleLinks;
        } catch (error) {
            console.error('Error getting article links:', error);
            throw error;
        }
    }

    public async getListMasterPages(): Promise<LinkPage[]> {
        const promises: Record<string, Promise<LinkPage> | null> = {};
        const response = await axios.get('https://tailieudieuky.com/baiviet/tai-lieu-va-ebook/');

        const $ = cheerio.load(response.data);
        $('.pagelayer-btn-holder.pagelayer-ele-link.pagelayer-btn-custom.pagelayer-btn-mini.pagelayer-btn-icon-left')
            .filter(function () {
                const href = $(this).attr('href');
                return typeof href === 'string';
            })
            .map((index, element) => {
                const href = $(element).attr('href')!;
                promises[href] = this.getLastPage(href)
                    .then((lastPage) => {
                        return { link: href, lastPage };
                    })
                    .catch(() => {
                        return { link: href, lastPage: 1 };
                    });
            });

        const entries = await Promise.all(Object.entries(promises).map(async ([href, promise]) => {
            const linkPage = await promise;
            return { link: href, lastPage: linkPage!.lastPage };
        }));

        return entries;
    }
}


// Export the class
export default TaiLieuDieuKyRepository;
