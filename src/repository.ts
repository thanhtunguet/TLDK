import { load } from "cheerio";
import { last } from "cheerio/lib/api/traversing";
import { getLastPage } from "./pages";

const axios = require('axios');

export class TaiLieuDieuKyRepository {

    async getListMasterPages() {
        const response = await axios.get('https://tailieudieuky.com/baiviet/tai-lieu-va-ebook/');
        const $ = load(response.data);
        $('.pagelayer-btn-holder.pagelayer-ele-link.pagelayer-btn-custom.pagelayer-btn-mini.pagelayer-btn-icon-left')
            .each(function () {
                const href = $(this).attr('href');
                if (typeof href === 'string') {
                    getLastPage(href)
                        .then((lastPage) => {
                            console.log(`${href} = ${last}`);
                        })
                        .catch((error) => {

                        });

                }
            });
    }
}

export const repository = new TaiLieuDieuKyRepository();
