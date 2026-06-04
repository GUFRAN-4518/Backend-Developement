import multer from "multer";

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function(req, file, cb){
        cb(null, file.originalname)
    }
})

export const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("video/") || file.fieldname === "thumbnail") {
            cb(null, true);
        } else {
            cb(new Error("Unsupported file format. Please upload a valid video or image."), false);
        }
    },
    limits: {
        fileSize: 100 * 1024 * 1024 // 100 MB file size limit
    }
})