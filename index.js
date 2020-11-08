const cheerio = require('cheerio');
const got = require('got');

const BASE_URL = "https://www.heritageit.edu/";
const NOTICE_URL = "https://www.heritageit.edu/Notice.aspx";

//matches if the given relative url is valid url of notice pdf file or not
const matchNoticeUrl = val => /NoticePDF\/[0-9]+NOT[0-9]+.pdf/i.test(val)

//Reads data from the heritage website
const getData = async () => {

    //creates a get request and returns the response
    const response = await got(NOTICE_URL);
    
    //cheerio parses the html and returns a jquery object 
    //to traverse and manipulate the DOM.
    const $ = cheerio.load(response.body);

    //This query returns list of all the <tr> child of <table> 
    //with id ctl00_ContentPlaceHolder1_GridView1
    const trows = $('table#ctl00_ContentPlaceHolder1_GridView1 tr').toArray();
    const notices = [];
    
    for(let i = 0,tr,name,date; i < trows.length; i++){

        tr = $(trows[i]);

        //finds the child <a> of current <tr>
        relUrl = $(tr).find('a').attr('href');

        //returns the text of <span> of the first <td> child of current <tr>
        name = $((tr).find("td").get(0)).find('span').html();

        //returns the text of <span> of the second <td> child of current <tr>
        date = $($(tr).find("td").get(1)).find("span").html();

        //if the relUrl is not a valid relative URL of notice PDF file
        //Then, this tr does not wrap a notice data
        if(matchNoticeUrl(relUrl)){
            notices.push({
                url: BASE_URL+relUrl,
                relUrl,
                name,
                date
            });
        }
    }
    return notices;    
}

exports.getData = getData;

//cloud function
exports.getNotices = async (req,res) => {
    const isPretty = req.query.pretty == 1;
    try {
        const notices = await getData();    
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
                            ${notices.map(n=>
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
            res.send(notices)
        }
    } catch(e){
        console.error(e);
        res.status(501).send({
            error: 'Failed get notifications'
        });
    }
} 