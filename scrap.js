require('dotenv').config();
const { getData } = require("./common");

getData(process.argv.length > 2 ? parseInt(process.argv[2]) : 1)
.then(data=>{
    console.log(data);
})
