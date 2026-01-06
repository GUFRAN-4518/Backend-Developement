import dotenv from "dotenv"
import connectDB from "./db/index.js"


dotenv.config({
    path: './env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`SERVER IS RUNNING AT PORT : ${process.env.PORT}`);
        
    })
})
.catch((error)=>{
    console.log("MONGODB CONNECTION FAILED !!!", error);
    
})

/*
import express from "express";
const app = express()

(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error)=>{
            console.log("ERR: ", error)
            throw error
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`APP IS LISTENING TO ${process.env.PORT}`);
        })
    } catch (error) {
        console.error("ERROR AA GAYA BHAI: ", error)
        throw error
    }
})()
*/