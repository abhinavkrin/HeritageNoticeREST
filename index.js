const cheerio = require('cheerio');
const got = require('got');

const BASE_URL = "https://www.heritageit.edu";
const NOTICE_URL = "https://www.heritageit.edu/Notice.aspx";

//matches if the given relative url is valid url of notice pdf file or not
const matchNoticeUrl = val => /NoticePDF\/[0-9]+NOT[0-9]+.pdf/i.test(val)

//Reads data from the heritage website
const getData = async () => {
    const response = await got(NOTICE_URL);
    const $ = cheerio.load(response.body);
    const trows = $('table#ctl00_ContentPlaceHolder1_GridView1 tr').toArray();
    const notices = [];
    for(let i = 0,tr,name,date; i < trows.length; i++){
        tr = $(trows[i]);
        relUrl = $(tr).find('a').attr('href');
        name = $((tr).find("td").get(0)).find('span').html();
        date = $($(tr).find("td").get(1)).find("span").html();
        if(matchNoticeUrl(relUrl)){
            notices.push({
                url: BASE_URL+relUrl,
                relUrl,
                name,
                date
            });
        }
    }
    return {notices};    
}

exports.getData = getData;

//cloud function
exports.getNotices = async (req,res) => {
    const isPretty = req.query.pretty == 1;
    try {
        const data = await getData();    
        if(isPretty){
            res.set('Content-Type','text/html');
            res.send(
                `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>HIT Notices</title>
                </head>
                <body>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Notice</th>
                                <th>Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.notices.map(n=>
                                `<tr>
                                    <td>
                                      ${n.date}
                                    </td>
                                    <td>
                                      ${n.name}
                                    </td>
                                    <td>
                                      <a href="${n.url}">
                                        ${n.url}
                                      </a>
                                    </td>
                                </tr>`)}
                        </tbody>
                    </table>
                </body>
                </html>
                `
            )
        } else {
            res.send(data)
        }
    } catch(e){
        console.error(e);
        res.status(501).send({
            error: 'Failed get notifications'
        });
    }
} 