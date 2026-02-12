import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Check, Upload, Camera, User, FileText, ScanFace, ClipboardCheck,
  AlertCircle, CheckCircle2
} from 'lucide-react';

const STEPS = [
  { label: 'Personal Info', icon: User },
  { label: 'ID Verification', icon: FileText },
  { label: 'Facial Recognition', icon: ScanFace },
  { label: 'Review & Submit', icon: ClipboardCheck },
];

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'France', 'Japan', 'Singapore', 'Kenya', 'South Africa', 'Nigeria',
];

const ID_TYPES = ['Passport', "Driver's License", 'National ID Card'];

export default function KycVerification() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [idType, setIdType] = useState('');
  const [frontId, setFrontId] = useState<File | null>(null);
  const [backId, setBackId] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);

  const frontIdRef = useRef<HTMLInputElement>(null);
  const backIdRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        if (!firstName.trim() || !lastName.trim() || !dob || !country || !address.trim()) {
          toast({ title: 'Missing Information', description: 'Please fill in all fields', variant: 'destructive' });
          return false;
        }
        return true;
      case 1:
        if (!idType || !frontId) {
          toast({ title: 'Missing Documents', description: 'Please select ID type and upload at least the front of your ID', variant: 'destructive' });
          return false;
        }
        return true;
      case 2:
        if (!selfie) {
          toast({ title: 'Missing Selfie', description: 'Please upload a selfie for facial recognition', variant: 'destructive' });
          return false;
        }
        return true;
      case 3:
        if (!consent) {
          toast({ title: 'Consent Required', description: 'Please agree to the terms before submitting', variant: 'destructive' });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    if (!validateStep(3)) return;
    setSubmitted(true);
    toast({ title: 'KYC Submitted', description: 'Your verification is under review' });
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (f: File | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'File Too Large', description: 'Maximum file size is 5MB', variant: 'destructive' });
        return;
      }
      setter(file);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="px-4 py-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-2xl bg-success flex items-center justify-center mb-6">
            <Check className="h-10 w-10 text-success-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Verification Submitted!</h1>
          <p className="text-muted-foreground mb-2 max-w-sm">
            Your KYC verification has been submitted for review. We will notify you via email once the process is complete.
          </p>
          <div className="bg-card border border-border/50 rounded-xl px-4 py-2 mt-4 mb-6">
            <p className="text-sm text-muted-foreground">
              Reference ID: <span className="font-mono text-foreground">KYC-{Date.now().toString(36).toUpperCase()}</span>
            </p>
          </div>
          <Button onClick={() => navigate('/payments')}>Return to Payment Methods</Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="px-4 py-4 space-y-6 max-w-2xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate('/payments')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Payment Methods</span>
        </button>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">KYC Verification</h1>
          <p className="text-muted-foreground">Complete your identity verification to unlock all features</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isCompleted = i < currentStep;
            const isActive = i === currentStep;
            return (
              <div key={i} className="relative z-10 flex flex-col items-center gap-1.5">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold transition-colors",
                  isCompleted && "bg-success text-success-foreground",
                  isActive && "bg-primary text-primary-foreground",
                  !isCompleted && !isActive && "bg-secondary text-muted-foreground"
                )}>
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:block">{step.label}</span>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="bg-card border border-border/50 rounded-xl p-6 space-y-5 animate-fade-in">
          {/* Step 1: Personal Info */}
          {currentStep === 0 && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
                <p className="text-sm text-muted-foreground">Provide your basic personal details for identity verification.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>First Name</Label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name</Label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input type="date" value={dob} onChange={e => setDob(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Country of Residence</Label>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select your country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Residential Address</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, City" />
              </div>
            </>
          )}

          {/* Step 2: ID Verification */}
          {currentStep === 1 && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">ID Document Verification</h2>
                <p className="text-sm text-muted-foreground">Upload a clear photo of your government-issued ID document.</p>
              </div>
              <div className="space-y-1.5">
                <Label>ID Document Type</Label>
                <select
                  value={idType}
                  onChange={e => setIdType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select document type</option>
                  {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Front ID */}
              <div className="space-y-1.5">
                <Label>Front of ID</Label>
                <input type="file" ref={frontIdRef} accept="image/*,.pdf" className="hidden" onChange={e => handleFileChange(e, setFrontId)} />
                {frontId ? (
                  <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-xl text-sm text-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{frontId.name}</span>
                    <button onClick={() => setFrontId(null)} className="ml-auto text-muted-foreground hover:text-destructive text-xs">Remove</button>
                  </div>
                ) : (
                  <button
                    onClick={() => frontIdRef.current?.click()}
                    className="w-full p-6 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center gap-2 text-muted-foreground"
                  >
                    <Upload className="h-8 w-8" />
                    <span className="text-sm">Click to upload</span>
                    <span className="text-xs">JPG, PNG or PDF (Max 5MB)</span>
                  </button>
                )}
              </div>

              {/* Back ID */}
              <div className="space-y-1.5">
                <Label>Back of ID</Label>
                <input type="file" ref={backIdRef} accept="image/*,.pdf" className="hidden" onChange={e => handleFileChange(e, setBackId)} />
                {backId ? (
                  <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-xl text-sm text-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{backId.name}</span>
                    <button onClick={() => setBackId(null)} className="ml-auto text-muted-foreground hover:text-destructive text-xs">Remove</button>
                  </div>
                ) : (
                  <button
                    onClick={() => backIdRef.current?.click()}
                    className="w-full p-6 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center gap-2 text-muted-foreground"
                  >
                    <Upload className="h-8 w-8" />
                    <span className="text-sm">Click to upload</span>
                    <span className="text-xs">JPG, PNG or PDF (Max 5MB)</span>
                  </button>
                )}
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm space-y-2">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Important Notes
                </div>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                  <li>Ensure all text is clearly visible and not blurry</li>
                  <li>Make sure the entire document is in the frame</li>
                  <li>Avoid glare and shadows on the document</li>
                  <li>Documents must be valid and not expired</li>
                </ul>
              </div>
            </>
          )}

          {/* Step 3: Facial Recognition */}
          {currentStep === 2 && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Facial Recognition</h2>
                <p className="text-sm text-muted-foreground">We need to verify that you are the person in the ID document.</p>
              </div>

              <div className="w-full aspect-square max-w-[240px] mx-auto bg-secondary rounded-2xl flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Camera className="h-12 w-12" />
                <span className="text-sm">Camera preview</span>
              </div>

              <div className="space-y-1.5">
                <Label>Upload a Selfie</Label>
                <input type="file" ref={selfieRef} accept="image/*" className="hidden" onChange={e => handleFileChange(e, setSelfie)} />
                {selfie ? (
                  <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-xl text-sm text-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{selfie.name}</span>
                    <button onClick={() => setSelfie(null)} className="ml-auto text-muted-foreground hover:text-destructive text-xs">Remove</button>
                  </div>
                ) : (
                  <button
                    onClick={() => selfieRef.current?.click()}
                    className="w-full p-6 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center gap-2 text-muted-foreground"
                  >
                    <Camera className="h-8 w-8" />
                    <span className="text-sm">Click to upload or take a photo</span>
                    <span className="text-xs">JPG or PNG (Max 5MB)</span>
                  </button>
                )}
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm space-y-2">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Guidelines for a good selfie
                </div>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                  <li>Make sure your face is clearly visible</li>
                  <li>Use good lighting without shadows</li>
                  <li>Remove sunglasses, hats, or face coverings</li>
                  <li>Look directly at the camera with a neutral expression</li>
                </ul>
              </div>
            </>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 3 && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Review & Submit</h2>
                <p className="text-sm text-muted-foreground">Please review your information before submitting.</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-secondary/50 rounded-xl space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                    <span className="text-muted-foreground">Full Name</span>
                    <span className="text-foreground">{firstName} {lastName}</span>
                    <span className="text-muted-foreground">Date of Birth</span>
                    <span className="text-foreground">{dob || '-'}</span>
                    <span className="text-muted-foreground">Country</span>
                    <span className="text-foreground">{country || '-'}</span>
                    <span className="text-muted-foreground">Address</span>
                    <span className="text-foreground">{address || '-'}</span>
                  </div>
                </div>

                <div className="p-4 bg-secondary/50 rounded-xl space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Document Verification</h3>
                  <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                    <span className="text-muted-foreground">ID Type</span>
                    <span className="text-foreground">{idType || '-'}</span>
                    <span className="text-muted-foreground">Front of ID</span>
                    <span className={frontId ? "text-success" : "text-destructive"}>{frontId ? 'Uploaded' : 'Not uploaded'}</span>
                    <span className="text-muted-foreground">Back of ID</span>
                    <span className={backId ? "text-success" : "text-muted-foreground"}>{backId ? 'Uploaded' : 'Not uploaded'}</span>
                    <span className="text-muted-foreground">Selfie</span>
                    <span className={selfie ? "text-success" : "text-destructive"}>{selfie ? 'Uploaded' : 'Not uploaded'}</span>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-sm text-muted-foreground">
                  I certify that the information provided is accurate and I consent to the processing of my personal data for verification purposes.
                </span>
              </label>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-2">
            {currentStep > 0 && (
              <Button variant="outline" className="flex-1" onClick={handlePrevious}>
                Previous
              </Button>
            )}
            {currentStep < STEPS.length - 1 ? (
              <Button className="flex-1" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleSubmit}>
                Submit Verification
              </Button>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
