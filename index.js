const cheerio = require('cheerio');
const axios = require('axios');
const qs = require('qs');

const BASE_URL = "https://www.heritageit.edu/";
const NOTICE_URL = "https://www.heritageit.edu/Notice.aspx";
const NOTICE_DIR_URL = "https://www.heritageid.edu/NoticePDF/"; 
//matches if the given relative url is valid url of notice pdf file or not
//const matchNoticeUrl = val => /NoticePDF\/[0-9]+NOT[0-9]+.pdf/i.test(val) || /NoticePDF\/[0-9]+Notice[0-9]+.pdf/i.test(val) 
const matchNoticeUrl = val => /NoticePDF\/.+\.pdf/i.test(val);

const getId = (relUrl) => relUrl.replace(/NOTICEPDF\//i,"").replace(/\.PDF/i,"");

const parseNotices = (body) => {
    //cheerio parses the html and returns a jquery object 
    //to traverse and manipulate the DOM.
    const $ = cheerio.load(body);

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
                id: getId(relUrl),
                url: BASE_URL+relUrl,
                relUrl,
                name,
                date
            });
        }
    }
    return notices;
}
const extractFormData = (body,page) => {
    const $ = cheerio.load(body);
    const __VIEWSTATE = $("#__VIEWSTATE").attr("value");
    const __EVENTVALIDATION = $("#__EVENTVALIDATION").attr("value");
    const __VIEWSTATEGENERATOR = $("#__VIEWSTATEGENERATOR").attr("value");
    return {
        __EVENTTARGET: "ctl00$ContentPlaceHolder1$GridView1",
        __EVENTARGUMENT: "Page$"+page,
        __VIEWSTATE,
        __VIEWSTATEGENERATOR,
        __EVENTVALIDATION
    }
}
//Reads data from the heritage website
const getData = async (page=1) => {

    //creates a get request and returns the response
    var config = {
        method: 'get',
        url: NOTICE_URL
    };
    const response = await axios(config);
    if(page===1 || page === "1")
        return {
            notices: parseNotices(response.data)
        }
    else {
        var formData = extractFormData(response.data,page);
        var data = qs.stringify(formData);
        var config2 = {
            method: "post",
            url: NOTICE_URL,
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded', 
            },
            data : data
        };
        const response2 = await axios(config2);
        return {
            notices: parseNotices(response2.data)
        };
    }
}

exports.getData = getData;

//cloud function
exports.getNotices = async (req,res) => {
    res.set('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        // Send response to OPTIONS requests
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Max-Age', '3600');
        res.status(204).send('');
        return;
    } 

    const isPretty = req.query.pretty == 1;
    const page = parseInt(req.query.page);
    try {
        const notices = await getData(page);    
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