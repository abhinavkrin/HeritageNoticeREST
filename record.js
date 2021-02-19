require('dotenv').config();
const { recordNotices } = require("./common");

// recordNotices(process.argv.length > 2 ? parseInt(process.argv[2]) : 1,false)
// .then(()=>{
//     console.log("Recorded. OK!");
// })


(async function(){
    for(i=25;i>=1;i--){
        try {
            await recordNotices(i,true)
            console.log("Recorded Page ",i);
        } catch(e){
            console.error(e);
        }
    }
})();