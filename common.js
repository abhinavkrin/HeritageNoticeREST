const cheerio = require('cheerio');
const axios = require('axios');
const qs = require('qs');
const admin = require('firebase-admin');
const { NOTICE_URL, FIREBASE_URL, DB, BASE_URL } = require("./config");

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    //databaseURL: FIREBASE_URL,
});

//matches if the given relative url is valid url of notice pdf file or not
//const matchNoticeUrl = val => /NoticePDF\/[0-9]+NOT[0-9]+.pdf/i.test(val) || /NoticePDF\/[0-9]+Notice[0-9]+.pdf/i.test(val) 
const matchNoticeUrl = val => /NoticePDF\/.+\.pdf/i.test(val);
exports.matchNoticeUrl = matchNoticeUrl;

const getId = (relUrl) => relUrl.replace(/NOTICEPDF\//i,"").replace(/\.PDF/i,"");
exports.getId = getId;

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
exports.parseNotices = parseNotices;

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
exports.extractFormData = extractFormData;

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

const saveNotice = async (notice) => {
    await admin.firestore()
        .collection(DB.NOTICES)
        .doc(notice.id)
        .set({
            ...notice,
            recorded: admin.firestore.Timestamp.now()
        });
}
exports.saveNotice = saveNotice;

const noticeExists = async (notice) => {
    return (await admin.firestore()
        .collection(DB.NOTICES)
        .doc(notice.id)
        .get()).exists;
}
exports.noticeExists = noticeExists;

const recordNotices = async (page=1) => {
    const data = await getData(page);
    const notices = data.notices;
    let count = 0;
    for(let i=notices.length-1; i >= 0; i--){
        const notice = notices[i];
        const exists = await noticeExists(notice);
        if(!exists){
            try {
                await saveNotice(notice);
                count++;
            } catch(e){
                console.error(e);
            }
        }
    }
    console.log("Total Notices Saved: ",count);
}
exports.recordNotices = recordNotices;