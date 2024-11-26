const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const path = require('path');
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs');
const bodyParser = require('body-parser'); // Import body-parser

const app = express();
const port = 5000;

app.use(cors());

// Use body-parser to parse JSON and URL-encoded data
app.use(bodyParser.json());  // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true }));  // Parse URL-encoded data

const uploadDir = path.join(__dirname, 'uploads');
if (!fsSync.existsSync(uploadDir)) {
  fsSync.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB limit
  }
});

app.post('/extract-text', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
// const lang = 'eng+afr+sqi+amh+ara+arm+asm+aze+eus+ben+bos+bul+cat+chi_sim+chi_tra+hrv+ces+dan+nld+est+fin+fra+kat+deu+ell+guj+hat+heb+hin+hun+isl+ind+ita+jpn+kan+kaz+kor+kur+lav+lit+mkd+msa+mal+mar+mon+nep+nor+pas+fas+pol+por+pan+ron+rus+srp+sin+slk+slv+spa+swa+swe+tam+tel+tha+tur+ukr+urd+vie+wel+yid';
    const imagePath = req.file.path;
    const lang = 'eng'; // Language code for OCR
    
    const { data: { text } } = await Tesseract.recognize(imagePath, lang, {
      logger: (m) => console.log(m),
    });

    await fs.unlink(imagePath);  // Delete the image file after processing

    res.json({ text });
  } catch (err) {
    console.error('OCR Error:', err);
    res.status(500).json({ 
      error: 'Failed to extract text', 
      details: err.message 
    });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
