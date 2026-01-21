import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, HelpCircle, MessageCircle, Mail, Phone, 
  ChevronDown, ChevronUp, Send
} from 'lucide-react';

const faqs = [
  {
    question: "How do I deposit funds?",
    answer: "You can deposit funds by going to Dashboard > Deposit. We support M-Pesa and other payment methods. Minimum deposit is $10."
  },
  {
    question: "How long do withdrawals take?",
    answer: "Withdrawals are typically processed within 24 hours. M-Pesa withdrawals are usually instant after approval."
  },
  {
    question: "What is a demo account?",
    answer: "A demo account allows you to practice trading with virtual money ($10,000). It's perfect for learning without risking real funds."
  },
  {
    question: "How do trading bots work?",
    answer: "Trading bots automatically execute trades based on predefined strategies. You set the parameters and the bot trades 24/7 on your behalf."
  },
  {
    question: "Is my money safe?",
    answer: "Yes, we use industry-standard security measures including 2FA, encryption, and secure payment processing to protect your funds."
  },
];

export default function HelpSupport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: ''
  });

  const handleSubmitTicket = () => {
    if (!contactForm.subject || !contactForm.message) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Ticket Submitted",
      description: "We'll get back to you within 24 hours",
    });
    setContactForm({ subject: '', message: '' });
    setShowContactForm(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-4 space-y-4">
        {/* Back Button */}
        <button 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Profile</span>
        </button>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
          <p className="text-muted-foreground">How can we help you?</p>
        </div>

        {/* Contact Options */}
        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => setShowContactForm(true)}
            className="p-4 rounded-xl bg-card border border-border/50 flex flex-col items-center gap-2 hover:bg-secondary transition-colors"
          >
            <Mail className="h-6 w-6 text-primary" />
            <span className="text-xs text-foreground">Email</span>
          </button>
          <a 
            href="https://wa.me/254700000000"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl bg-card border border-border/50 flex flex-col items-center gap-2 hover:bg-secondary transition-colors"
          >
            <MessageCircle className="h-6 w-6 text-primary" />
            <span className="text-xs text-foreground">WhatsApp</span>
          </a>
          <a 
            href="tel:+254700000000"
            className="p-4 rounded-xl bg-card border border-border/50 flex flex-col items-center gap-2 hover:bg-secondary transition-colors"
          >
            <Phone className="h-6 w-6 text-primary" />
            <span className="text-xs text-foreground">Call</span>
          </a>
        </div>

        {/* FAQs */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Frequently Asked Questions
          </h2>
          
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="rounded-xl bg-card border border-border/50 overflow-hidden"
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <span className="font-medium text-foreground pr-4">{faq.question}</span>
                {expandedFaq === index ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
              </button>
              {expandedFaq === index && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Form Modal */}
        {showContactForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl p-6 w-full max-w-md space-y-4">
              <h2 className="text-lg font-bold text-foreground">Contact Support</h2>
              
              <Input 
                placeholder="Subject" 
                value={contactForm.subject}
                onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
              />
              <Textarea 
                placeholder="Describe your issue..." 
                rows={4}
                value={contactForm.message}
                onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
              />

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowContactForm(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSubmitTicket}>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
