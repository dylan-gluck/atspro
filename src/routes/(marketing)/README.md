# ATSPro - Marketing Routes

The marketing route group (`/(marketing)`) contains all public-facing pages of the ATSPro application. These routes are designed to attract, educate, and convert visitors into users.

## Route Structure

```
/(marketing)/
├── +layout.svelte          # Marketing site layout
├── +page.svelte            # Landing page (/)
├── README.md               # This documentation
└── auth/
    └── [method]/
        ├── +page.svelte    # Dynamic auth pages
        └── README.md       # Auth documentation
```

## Purpose & Target Audience

The marketing site is specifically designed for **young professionals** applying for jobs in a competitive market who struggle with ATS (Applicant Tracking System) rejection rates. The messaging focuses on the core problem: 85% of qualified candidates never get past ATS filters.

## Landing Page Features (`/`)

### Hero Section

- **Value Proposition**: "Stop Letting ATS Systems Ignore Your Perfect Resume"
- **Key Statistic**: Increases ATS pass rate from 15% to 85% (400% improvement)
- **Social Proof**: 4.9/5 rating from 1,000+ users
- **CTAs**: "Start Free - No Credit Card Required" and "Learn More"
- **Visual Elements**: Mock resume preview with ATS score badge

### Features Section (`#features`)

Comprehensive overview of 6 core features:

1. **ATS Resume Optimization** - AI-powered keyword matching and formatting
2. **ATS Resume Scanner & Checker** - Real-time compatibility scoring
3. **Job Matching & Tracking** - Application management and recommendations
4. **Cover Letter Generation** - Personalized cover letters
5. **Interview Preparation** - AI-generated questions and coaching
6. **Analytics & Insights** - Progress tracking and optimization suggestions

### How It Works Section (`#how-it-works`)

4-step process visualization:

1. Upload Your Resume
2. Add Job Details
3. AI Optimization
4. Download & Apply

### Pricing Section (`#pricing`)

Three-tier pricing structure:

- **Starter**: $0/month (3 ATS scans, basic features)
- **Professional**: $19/month (unlimited scans, advanced features) - Most Popular
- **Premium**: $39/month (everything + white-glove service)

Features promotional offer: 50% off first 3 months for paid plans

### Call-to-Action Section

Final conversion section with testimonial and risk-free trial messaging.

## Auth Flow (`/auth/[method]`)

### Supported Methods

- `/auth/sign-in` - User login form
- `/auth/sign-up` - User registration form
- `/auth/forgot-password` - Password reset flow (not yet implemented)

### Auth Features

- **Dynamic Form Rendering**: Single component handles all auth methods
- **Email/Password Authentication**: Primary login method
- **Social Login Placeholders**: Google and GitHub (not yet configured)
- **Form Validation**: Real-time error handling
- **Redirect Logic**:
  - Sign-in success → `/app`
  - Sign-up success → `/onboarding`
  - Authenticated users visiting auth pages → `/app`

### Form Configuration

Each auth method has specific configuration:

- **Fields**: Conditionally shown based on method (name, password, remember me)
- **Social Options**: Shown for sign-in/sign-up, hidden for password reset
- **Navigation**: Cross-linking between auth methods

## Layout Structure (`+layout.svelte`)

### Header Navigation

- **Logo**: ATSPro with BrainCircuit icon
- **Navigation Links**: Features, How It Works, Pricing, About (smooth scroll)
- **Auth Buttons**: Sign In (ghost) and Get Started (primary)
- **Responsive**: Collapses navigation on mobile

### Footer

Comprehensive footer with 4 columns:

1. **Brand**: Logo, tagline, social media links
2. **Product**: Features, Pricing, API Docs, Integrations
3. **Company**: About, Blog, Careers, Contact
4. **Legal**: Privacy, Terms, Cookies, GDPR

## SEO Considerations

### Meta Tags

- **Title**: "ATS Resume Optimization | Beat 99% of ATS Systems | ATSPro"
- **Description**: Focus on transformation promise and statistics
- **Keywords**: ATS optimization, resume scanner, ATS friendly resumes

### Content Strategy

- **Problem-Solution Focus**: Addresses specific ATS rejection pain point
- **Statistical Evidence**: Uses concrete numbers (85% rejection rate, 400% improvement)
- **Trust Signals**: User ratings, testimonials, risk-free trials
- **Action-Oriented Language**: "Transform", "Beat", "Optimize", "Dominate"

## Conversion Optimization Features

### Trust Building

- **Social Proof**: User ratings and testimonial quotes
- **Risk Reduction**: Free trial, no credit card required
- **Authority Signals**: "99% of Fortune 500 Use ATS" badge
- **Transparency**: Clear pricing, feature comparisons

### Call-to-Action Strategy

- **Primary CTA**: "Start Free - No Credit Card Required" (appears 4+ times)
- **Secondary CTAs**: "Learn More", "View All Features"
- **Visual Enhancement**: Rocket icons, arrow animations on hover
- **Urgency**: Limited-time 50% off promotion

### User Experience

- **Smooth Scrolling**: Navigation links use smooth scroll behavior
- **Responsive Design**: Mobile-first approach with responsive grids
- **Loading States**: Form submissions show loading indicators
- **Error Handling**: Clear error messages with actionable guidance

## Technical Implementation

### Svelte 5 Features

- **Runes**: Uses `$state`, `$derived` for reactive state management
- **Event Handlers**: Arrow functions for proper event handling
- **Props**: Modern `$props()` syntax for component props

### UI Components

- **shadcn/ui**: Consistent design system with Cards, Buttons, Badges
- **Lucide Icons**: Professional iconography throughout
- **CSS Classes**: Tailwind utility classes for styling

### Navigation

- **SvelteKit**: Uses `goto()` for programmatic navigation
- **Scroll Handling**: Custom scroll-into-view functionality
- **State Management**: URL-based routing with dynamic content

## Future Enhancements

### Missing Features (TODO)

- Google OAuth integration
- GitHub OAuth integration
- Password reset functionality
- Blog section implementation
- Company pages (About, Careers, Contact)
- Legal pages (Terms, Privacy, Cookies)

### Optimization Opportunities

- A/B testing framework for CTAs
- Advanced analytics tracking
- Progressive web app features
- Performance optimization for mobile
- International localization support
