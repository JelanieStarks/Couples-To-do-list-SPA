# Couples To-Do List SPA 💕

![Couples To-Do App](https://github.com/user-attachments/assets/43c3eb02-ae2b-45f3-af15-c45a411838c0)

A delightful React + Tailwind CSS single-page application designed specifically for couples to organize their lives together with style, humor, and ADHD-friendly features. Powered by Jarvis-level AI assistance! 🤖

## ✨ Features

### 🔐 Smart Authentication
- **LocalStorage-based login** - No servers, no hassle
- **Invite code system** - Share 6-character codes to connect with your partner
- **Partner linking** - Sync tasks and collaborate seamlessly

### 📝 Intelligent Task Management
- **Full CRUD operations** - Create, edit, delete, and complete tasks
- **Priority system** - A (urgent), B (important), C (nice-to-have), D (someday)
- **Color coding** - 10 beautiful colors to organize your thoughts
- **Smart descriptions** - Add detailed notes to any task

### 🧠 AI-Powered Import
- **Text parsing** - Import tasks from any text format
- **Multiple formats supported**:
  - `[A] Task title: description`
  - `Priority B: Task name`
  - `Task (Priority: C)`
  - Bullet points and numbered lists
- **Section separation** - Use `---` to organize different categories
- **Bulk import** - Turn meeting notes into organized tasks instantly

### 📅 Weekly Calendar
- **Drag & drop scheduling** - Move tasks between days effortlessly
- **Today's focus** - Highlighted current day with priority sorting
- **Weekly overview** - Monday through Sunday columns
- **Visual task management** - See your week at a glance

### 💖 Partner Collaboration
- **Task sharing** - Share any task with your partner
- **Gradient styling** - Shared tasks get beautiful gradient backgrounds
- **Creator tracking** - See who created each task
- **Partner status** - Know when you're connected

### 🎨 ADHD-Friendly Design
- **Clear visual hierarchy** - Easy to scan and understand
- **Gentle animations** - Smooth transitions without overwhelm
- **Color-coded priorities** - Red (A) to Green (D) system
- **Jarvis commentary** - Helpful and humorous guidance
- **Progress tracking** - Visual completion percentages

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/JelanieStarks/Couples-To-do-list-SPA.git
   cd Couples-To-do-list-SPA
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### Production Build
```bash
npm run build
npm run preview
```

## 🎯 How to Use

### First Time Setup
1. **Enter your name** (and optionally email)
2. **Share your invite code** with your partner
3. **Connect using their code** if they already signed up
4. **Start creating tasks!**

### Creating Tasks
![Task Creation](https://github.com/user-attachments/assets/241b99b4-0605-4b1f-ba2b-db351cd0ad15)

1. Click **"Add New Task"**
2. Fill in the title and description
3. Choose priority (A = urgent, D = someday)
4. Pick a color that makes you happy
5. Set a date (optional)
6. Create and watch it appear!

### AI Import Magic
![AI Import](https://github.com/user-attachments/assets/82828cfd-e5d0-4f0a-8da3-62342bc6295d)

Copy and paste text from anywhere:
```
--- Work Tasks ---
[A] Finish quarterly report: Due Friday at 5 PM
[B] Schedule team meeting
Priority C: Update documentation

--- Personal ---
- Plan date night with partner
- Clean garage (Priority: D)
- Read new book chapter
```

Jarvis will automatically parse it into organized tasks with proper priorities!

### Calendar Management
- **Drag tasks** between days to reschedule
- **Today's column** is highlighted in blue
- **Priority A tasks** get special "URGENT" treatment
- **Progress tracking** shows completion percentages

## 🛠 Tech Stack

- **React 19** - Latest React with concurrent features
- **TypeScript** - Full type safety
- **Tailwind CSS** - Utility-first styling with custom theme
- **Vite** - Lightning fast build tool
- **@dnd-kit** - Smooth drag and drop
- **Lucide React** - Beautiful icons
- **LocalStorage** - Persistent data without servers

## 🎨 Design Philosophy

### ADHD-Friendly Principles
- **Clear visual hierarchy** - Important things stand out
- **Gentle animations** - Smooth without being distracting
- **Color coding** - Visual shortcuts to information
- **Progress feedback** - Celebrate completions
- **Humor integration** - Jarvis keeps things light

### Couples-Focused Features
- **Shared responsibility** - Both partners can manage tasks
- **Visual distinction** - Shared tasks have gradient backgrounds
- **Individual ownership** - Clear attribution of who created what
- **Collaborative planning** - Weekly view for joint scheduling

## 🤖 Meet Jarvis

Your AI-powered productivity assistant provides:
- **Helpful commentary** on Priority A tasks
- **Parsing intelligence** for AI imports
- **ADHD-friendly tips** in the floating help bubble
- **Productivity wisdom** with Iron Man references
- **Gentle encouragement** throughout the app

## 📱 Responsive Design

Works beautifully on:
- **Desktop** - Full featured experience
- **Tablet** - Optimized layout
- **Mobile** - Touch-friendly interface

## 🔒 Privacy & Data

- **No servers** - Everything stored locally
- **No tracking** - Your data stays on your device
- **No accounts** - Just names and invite codes
- **Partner connection** - Simulated locally (in real app, would use secure API)

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

### GitHub Pages
```bash
npm run build
# Deploy dist/ folder to gh-pages branch
```

## 🧪 Development

### Project Structure
```
src/
├── components/
│   ├── auth/           # Login and partner management
│   ├── tasks/          # Task CRUD and AI import
│   ├── calendar/       # Weekly planner
│   └── ui/            # Layout and reusable components
├── contexts/          # React Context for state management
├── types/             # TypeScript interfaces
├── utils/             # Helper functions and utilities
└── App.jsx           # Main application component
```

### Key Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## � Testing

The project uses **Vitest** + **@testing-library/react** with a lightweight setup oriented around clarity and behavior-driven assertions.

### Running Tests
```bash
npm test          # One-off run
npm run test:watch  # Watch mode while developing
```

### What Is Covered (Currently)
- Core Task lifecycle (create, complete, soft delete, restore, hard delete)
- Timestamp ordering for completed tasks (newest first)

### Coming Soon (Good First Issues)
- Parsing edge cases for AI import
- Date-based filtering and scheduling behaviors
- Drag + drop interaction state tests (dnd-kit harness)

### Coverage
Coverage reporting is enabled. After a run you'll see summary output (LCOV is generated for CI tooling).

### Testing Philosophy
1. **Readable over clever** – Straightforward expectations using jest-dom matchers.
2. **Behavior over implementation** – Focus on what the context returns, not internal state details.
3. **Small & Focused** – Each test isolates one feature path.
4. **Deterministic** – Avoid relying on timers or real network.

### File Locations
```
src/contexts/__tests__/TaskContext.test.tsx
vitest.setup.ts
```

### Adding New Tests
1. Create a file near the code under `__tests__` or co-locate as `*.test.tsx`.
2. Use `render` from `@testing-library/react` for component tests.
3. Import shared matchers automatically via `vitest.setup.ts`.

### Example Snippet
```ts
import { describe, it, expect } from 'vitest';

describe('math', () => {
   it('adds', () => {
      expect(1 + 1).toBe(2);
   });
});
```

If you add new context APIs, ensure:
- Edge cases (empty input) are tested
- State mutations update timestamps where expected
- Items hidden by filters stay hidden

> Tip: For complex async UI flows, prefer `findBy*` queries and avoid arbitrary `setTimeout` usage.

## �🤝 Contributing

We'd love your help making this app even better!

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Ideas for Contributions
- **Real-time sync** - Replace LocalStorage with backend
- **Mobile app** - React Native version
- **Themes** - Dark mode and custom themes
- **Integrations** - Calendar sync, email reminders
- **AI enhancements** - Better parsing, smart suggestions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Iron Man/Jarvis** - Inspiration for the AI assistant personality
- **ADHD community** - Insights for accessibility features
- **Couples everywhere** - Who manage life together every day
- **Open source community** - For the amazing tools that made this possible

---

**Built with ❤️ for couples who want to conquer life together, one task at a time!**

*"Sir, I've analyzed your productivity patterns. Remember: Priority A tasks are like arc reactor maintenance - critical for survival. Everything else is just Iron Man suit upgrades."* - Jarvis 🤖
