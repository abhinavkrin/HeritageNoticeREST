### HOW TO DEPLOY

`
npm install
gcloud functions deploy getNotices --set-env-vars NOTICE_URL=notice-url-with-slash,BASE_URL=heritage-base-url-with-slash --runtime nodejs10 --trigger-http --allow-unauthenticated 
`