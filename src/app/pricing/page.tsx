import { useState } from 'react'
import Link from 'next/link'
import { Check, X, Menu, HelpCircle, Mic, FileText, Shield, Users, Download, Zap, Building2, ChevronDown } from 'lucide-react'

interface PricingTier {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  excluded: string[]
  cta: string
  highlighted: boolean
  icon: React.ReactNode
}

interface FAQItem {
  question: string
  answer: string
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'For solo operators testing the waters',
    features: [
      'Daily voice memo recording',
      'Whisper API transcription',
      '7-day history retention',
      'Basic auto-tagging',
      'Mobile app access',
      '1 user'
    ],
    excluded: [
      'AI runbook assembler',
      'Ghost Mode simulation',
      'Bus factor analyzer',
      'Offline PDF generator',
      'Delegate assignment'
    ],
    cta: 'Get Started Free',
    highlighted: false,
    icon: <Mic className="w-6 h-6" />
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/month',
    description: 'For owners ready to document their business',
    features: [
      'Everything in Free, plus:',
      'Unlimited voice history',
      'AI runbook assembler',
      'Ghost Mode simulation engine',
      'Advanced auto-tagging by function',
      'Priority email support',
      '3 team members'
    ],
    excluded: [
      'Bus factor risk analyzer',
      'Offline emergency PDFs',
      'Delegate verification system'
    ],
    cta: 'Start Pro Trial',
    highlighted: true,
    icon: <Zap className="w-6 h-6" />
  },
  {
    name: 'Business',
    price: '$49',
    period: '/month',
    description: 'For trade businesses with 2-20 employees',
    features: [
      'Everything in Pro, plus:',
      'Bus factor risk analyzer',
      'Offline emergency PDF generator',
      'QR code posting system',
      'Delegate assignment & verification',
      'Employee cross-training tracker',
      'Unlimited team members',
      'API access',
      'Priority phone support'
    ],
    excluded: [],
    cta: 'Contact Sales',
    highlighted: false,
    icon: <Building2 className="w-6 h-6" />
  }
]

const faqs: FAQItem[] = [
  {
    question: 'How does the voice memo system work?',
    answer: 'Record 2-minute daily voice memos through our mobile app or web interface. We use OpenAI\'s Whisper API to transcribe with 99% accuracy, then auto-tag content by business function: operations, finance, client management, or vendor relations.'
  },
  {
    question: 'What is Ghost Mode?',
    answer: 'Ghost Mode temporarily hides all knowledge contributed by the owner and assigns employees crisis scenarios. This stress-test identifies exactly which procedures would fail if you were unavailable, revealing critical documentation gaps.'
  },
  {
    question: 'Can I export my emergency procedures?',
    answer: 'Business tier users can generate offline PDFs with QR codes for physical posting in your shop. These contain critical contacts, supplier lists, and emergency shutdown procedures accessible without internet or app access.'
  },
  {
    question: 'How does the Bus Factor analyzer work?',
    answer: 'We map dependency scores across your business functions, identifying which procedures lack documented backups and which employees lack cross-training. You\'ll see exactly where single points of failure exist.'
  },
  {
    question: 'Is there a limit on voice memos?',
    answer: 'Free tier includes unlimited recording but only 7 days of history. Pro and Business tiers offer unlimited historical storage and advanced AI processing to build comprehensive runbooks from your entire memo history.'
  }
]

const featureComparison = [
  { feature: 'Daily voice recording', free: true, pro: true, business: true },
  { feature: 'Whisper API transcription', free: true, pro: true, business: true },
  { feature: 'Auto-tagging by function', free: 'Basic', pro: 'Advanced', business: 'Advanced' },
  { feature: 'History retention', free: '7 days', pro: 'Unlimited', business: 'Unlimited' },
  { feature: 'AI runbook assembler', free: false, pro: true, business: true },
  { feature: 'Ghost Mode simulation', free: false, pro: true, business: true },
  { feature: 'Bus factor analyzer', free: false, pro: false, business: true },
  { feature: 'Offline PDF generator', free: false, pro: false, business: true },
  { feature: 'QR code emergency posting', free: false, pro: false, business: true },
  { feature: 'Delegate verification', free: false, pro: false, business: true },
  { feature: 'Team members', free: '1', pro: '3', business: 'Unlimited' },
  { feature: 'API access', free: false, pro: false, business: true },
  { feature: 'Priority support', free: false, pro: 'Email', business: 'Phone' }
]

export default function PricingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#2C3E50] flex items-center justify-center">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-[#2C3E50] tracking-tight">Backup Boss</span>
              </Link>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/features" className="text-slate-600 hover:text-[#2C3E50] font-medium transition-colors">Features</Link>
              <Link href="/pricing" className="text-[#2C3E50] font-semibold">Pricing</Link>
              <Link href="/about" className="text-slate-600 hover:text-[#2C3E50] font-medium transition-colors">About</Link>
              <Link href="/contact" className="text-slate-600 hover:text-[#2C3E50] font-medium transition-colors">Contact</Link>
              <button className="bg-[#2C3E50] text-white px-4 py-2 font-medium hover:bg-slate-700 transition-colors">
                Get Started
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:text-[#2C3E50]"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200">
            <div className="px-4 pt-2 pb-6 space-y-1">
              <Link href="/features" className="block px-3 py-2 text-slate-600 hover:text-[#2C3E50] font-medium">Features</Link>
              <Link href="/pricing" className="block px-3 py-2 text-[#2C3E50] font-semibold">Pricing</Link>
              <Link href="/about" className="block px-3 py-2 text-slate-600 hover:text-[#2C3E50] font-medium">About</Link>
              <Link href="/contact" className="block px-3 py-2 text-slate-600 hover:text-[#2C3E50] font-medium">Contact</Link>
              <button className="w-full mt-4 bg-[#2C3E50] text-white px-4 py-3 font-medium">
                Get Started
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <div className="bg-[#2C3E50] py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            Simple pricing for business continuity
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto">
            Start free, upgrade when you are ready to protect your business from single points of failure.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-24">
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {pricingTiers.map((tier) => (
            <div 
              key={tier.name}
              className={`relative bg-white border-2 ${tier.highlighted ? 'border-[#2C3E50] shadow-xl scale-105 z-10' : 'border-slate-200'} flex flex-col`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-[#2C3E50] text-white px-4 py-1 text-sm font-semibold uppercase tracking-wider">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="p-6 sm:p-8 flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 ${tier.highlighted ? 'bg-[#2C3E50] text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {tier.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{tier.name}</h3>
                </div>
                
                <div className="mb-4">
                  <span className="text-4xl font-bold text-slate-900">{tier.price}</span>
                  <span className="text-slate-500 font-medium">{tier.period}</span>
                </div>
                
                <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                  {tier.description}
                </p>
                
                <button 
                  className={`w-full py-3 px-4 font-semibold transition-colors ${tier.highlighted ? 'bg-[#2C3E50] text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                >
                  {tier.cta}
                </button>
                
                <div className="mt-8 space-y-4">
                  <p className="font-semibold text-slate-900 text-sm uppercase tracking-wider">Includes:</p>
                  <ul className="space-y-3">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                    {tier.excluded.map((feature, idx) => (
                      <li key={`ex-${idx}`} className="flex items-start gap-3 text-sm opacity-50">
                        <X className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-500">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Comparison */}
      <div className="bg-white py-16 sm:py-24 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">Compare all features</h2>
            <p className="text-slate-600">Everything you need to know about what's included in each tier</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-4 px-4 font-semibold text-slate-900">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-600">Free</th>
                  <th className="text-center py-4 px-4 font-semibold text-[#2C3E50] bg-slate-50">Pro</th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-900">Business</th>
                </tr>
              </thead>
              <tbody>
                {featureComparison.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-4 text-slate-700 font-medium">{row.feature}</td>
                    <td className="py-4 px-4 text-center">
                      {typeof row.free === 'boolean' ? (
                        row.free ? <Check className="w-5 h-5 text-green-600 mx-auto" /> : <X className="w-5 h-5 text-slate-300 mx-auto" />
                      ) : (
                        <span className="text-slate-600 text-sm">{row.free}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center bg-slate-50">
                      {typeof row.pro === 'boolean' ? (
                        row.pro ? <Check className="w-5 h-5 text-green-600 mx-auto" /> : <X className="w-5 h-5 text-slate-300 mx-auto" />
                      ) : (
                        <span className="text-[#2C3E50] font-medium text-sm">{row.pro}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof row.business === 'boolean' ? (
                        row.business ? <Check className="w-5 h-5 text-green-600 mx-auto" /> : <X className="w-5 h-5 text-slate-300 mx-auto" />
                      ) : (
                        <span className="text-slate-900 font-medium text-sm">{row.business}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-slate-50 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            <p className="text-slate-600">Everything you need to know about Backup Boss</p>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-semibold text-slate-900 pr-4">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-6">
                    <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-slate-600 mb-4">Still have questions?</p>
            <button className="inline-flex items-center gap-2 text-[#2C3E50] font-semibold hover:underline">
              <HelpCircle className="w-5 h-5" />
              Contact our support team
            </button>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#2C3E50] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to make your business owner-independent?
          </h2>
          <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
            Join skilled trade owners who can finally take vacations without their business falling apart.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-[#2C3E50] px-8 py-3 font-bold hover:bg-slate-100 transition-colors">
              Start Free Trial
            </button>
            <button className="border-2 border-white text-white px-8 py-3 font-bold hover:bg-white/10 transition-colors">
              Schedule Demo
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Mic className="w-5 h-5 text-white" />
                <span className="font-bold text-white">Backup Boss</span>
              </div>
              <p className="text-sm">Voice-first business continuity for skilled trades.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-sm text-center">
            © {new Date().getFullYear()} Backup Boss. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}