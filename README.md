## Env Setup
- Create temp dir Desktop/donation-tracker
- In vscode, open that folder
- in vscode terminal set up the Node/react env:
  - npm create vite@latest . -- --template react
  - npm install # lots of local node_modules get installed, but are .gitignore
  - npm install firebase lucide-react  - npm create vite@latest
  - copy from Gemini to src/App.jsx

- Tailwind setup   # css will not work right without all this
  - npm install -D tailwindcss postcss autoprefixer # install dependencies - got lots of warns
  - npx tailwindcss init -p    # for tailwind to work locally
  - edit tailwind.config.js to include:
  ```
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  ```

- TO test locally:
  - npm run dev (runs on localhost for test)

- Git/GitHub setup
  - on github.com/ekzoss create empty repo named donation-tracker
  - git init
  - git add .
  - git commit -m "Initial commit: donation-tracker"
  - git branch -M main
  - git remote add origin https://github.ibm.com/ekzoss/donation-tracker.git
  - git push -u origin main
- vercel.com: New->Project, Import the project from my git repo which vercel is already linked.
  - Note: vercel has option you can set up env var values in there for secrets so they're not in public git repo.. for these projects I don't care
- zoneedit.com - setup cname in dns to redirect to vercel app domain name

## App Generation
- Google gemini created "single file react app" which creates the src/App.jsx to use
- Used firebase.google.com for the database.
- Used email.js for email
- Used vercel.com for automatic build/host from github
- replaced App.jsx with code from Gemini
- add firebase config to App.jsx
- add email.js config to App.jsx (new template id, reuse gmail service id)
- firebase config: add a database
- firebase config: allow anon access, and modify rules to allow that
- firebase config: allow anon access, but only from vercel website: HOW?  Not sure I actually did this...
- Development loop was to edit local version in vscode (while npm run dev was going, automatically updating localhost copy as I saved changes), then commit and push to github to publish to prod.. a minute later vercel would pick up changes, rebuild it with vite and publish it.

