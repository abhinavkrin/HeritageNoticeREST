### HOW TO DEPLOY

```
npm install
gcloud init
gcloud functions deploy getNotices --runtime nodejs10 --trigger-http --allow-unauthenticated 
```

See [config.js]('/config.js') for environment variables. 