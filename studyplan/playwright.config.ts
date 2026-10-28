import { defineConfig, devices } from '@playwright/test';
const liveURL=process.env.STUDYPLAN_BASE_URL;
export default defineConfig({testDir:'tests/e2e',timeout:30000,fullyParallel:true,use:{baseURL:liveURL||'http://127.0.0.1:4173/',trace:'retain-on-failure'},webServer:liveURL?undefined:{command:'npm run preview -- --port 4173',url:'http://127.0.0.1:4173/',reuseExistingServer:false},projects:[{name:'chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},{name:'webkit-mobile',use:{...devices['iPhone 13'],defaultBrowserType:'webkit'}}]});
