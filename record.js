require('dotenv').config();
const { recordNotices } = require("./common");

recordNotices(process.argv.length > 2 ? parseInt(process.argv[2]) : 1)
.then(()=>{
    console.log("Recorded. OK!");
})
