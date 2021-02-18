const { getData, recordNotices } = require("./common");

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

exports.checkNotices = async (event,context) => {
    await recordNotices();
}