# Flare - Symptom Tracker

A clean, mobile-optimized web app for tracking endometriosis and IBS symptoms alongside menstrual cycle data.

## Features

- **Daily Symptom Logging**: Track endometriosis and IBS symptoms with severity ratings
- **Cycle Tracking**: Mark period start and end dates
- **Calendar View**: Visual overview of periods and symptom days
- **Insights Dashboard**:
  - Symptom trends over last 30 days
  - Average symptoms by cycle phase (Menstrual, Follicular, Ovulation, Luteal)
  - Cycle statistics (average period length, cycle length)
- **Data Export**: Download your data as JSON
- **Privacy First**: All data stored locally on device using localStorage

## Deployment to GitHub Pages

### 1. Create a GitHub Repository

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - Flare symptom tracker"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR-USERNAME/flare.git
git branch -M main
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Source", select **main** branch
4. Click **Save**
5. Your site will be live at: `https://YOUR-USERNAME.github.io/flare/`

### 3. Access the App

After a few minutes, visit your GitHub Pages URL. You can:
- Add it to your phone's home screen (works like an app!)
- Share the URL with anyone who needs it
- All data stays private on each device

## Local Development

To test locally, simply open `index.html` in a web browser. No build process needed!

## Technology Stack

- **HTML5/CSS3/JavaScript** - Pure vanilla, no frameworks
- **Chart.js** - Data visualizations
- **localStorage** - Client-side data persistence
- **Mobile-first responsive design**

## Data Management

- Data is stored locally in your browser
- Use "Export Data" to create backups
- "Clear All Data" permanently deletes everything

## Browser Support

Works on all modern browsers (Chrome, Safari, Firefox, Edge) on both desktop and mobile devices.
