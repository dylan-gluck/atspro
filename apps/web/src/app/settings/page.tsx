"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUserService, useAuthService } from "@/lib/services"
import { toast } from "sonner"
import { 
  ArrowLeft,
  User, 
  Settings, 
  Bell, 
  Shield, 
  CreditCard,
  Save,
  AlertCircle,
  Check,
  Mail,
  Phone,
  MapPin,
  Briefcase
} from "lucide-react"
import type { BetterAuthUser, UserProfile, UserSettings } from "@/types/database"

export default function SettingsPage() {
  const router = useRouter()
  const userService = useUserService()
  const authService = useAuthService()
  
  // State for user data
  const [user, setUser] = useState<BetterAuthUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  
  // Form data
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    title: '',
    bio: ''
  })
  
  const [settingsForm, setSettingsForm] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    preferences: {
      auto_optimize: false,
      save_drafts: true,
      default_privacy: 'private' as 'public' | 'private'
    }
  })
  
  // Error state
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUserData()
  }, [userService, authService])

  const loadUserData = async () => {
    if (!userService || !authService) return

    setIsLoading(true)
    setError(null)

    try {
      // Load user from auth service
      const userResponse = await authService.getCurrentUser()
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data)
        setProfileForm(prev => ({
          ...prev,
          name: userResponse.data?.name || '',
          email: userResponse.data?.email || ''
        }))
      }

      // Load user profile
      const profileResponse = await userService.getProfile()
      if (profileResponse.success && profileResponse.data) {
        setProfile(profileResponse.data)
        setProfileForm(prev => ({
          ...prev,
          phone: profileResponse.data.phone || '',
          location: profileResponse.data.location || '',
          title: profileResponse.data.title || '',
          bio: profileResponse.data.bio || ''
        }))
      }

      // Load user settings
      const settingsResponse = await userService.getSettings()
      if (settingsResponse.success && settingsResponse.data) {
        setSettings(settingsResponse.data)
        setSettingsForm({
          theme: settingsResponse.data.theme,
          notifications: settingsResponse.data.notifications,
          preferences: settingsResponse.data.preferences
        })
      }
    } catch (err) {
      console.error('Failed to load user data:', err)
      setError("Failed to load user settings. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileSave = async () => {
    if (!userService || !authService) return

    setIsSavingProfile(true)
    try {
      // Update name and email through auth service
      if (profileForm.name !== user?.name) {
        const nameResponse = await userService.updateUserName(profileForm.name)
        if (!nameResponse.success) {
          throw new Error(nameResponse.message || "Failed to update name")
        }
      }

      if (profileForm.email !== user?.email) {
        const emailResponse = await userService.updateUserEmail(profileForm.email)
        if (!emailResponse.success) {
          throw new Error(emailResponse.message || "Failed to update email")
        }
      }

      // Update profile fields
      const profileData = {
        phone: profileForm.phone || undefined,
        location: profileForm.location || undefined,
        title: profileForm.title || undefined,
        bio: profileForm.bio || undefined
      }

      const profileResponse = await userService.updateProfile(profileData)
      if (profileResponse.success) {
        setProfile(profileResponse.data)
        toast.success("Profile updated successfully!")
        
        // Refresh user data
        await loadUserData()
      } else {
        throw new Error(profileResponse.message || "Failed to update profile")
      }
    } catch (err) {
      console.error('Failed to save profile:', err)
      toast.error(err instanceof Error ? err.message : "Failed to save profile")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSettingsSave = async () => {
    if (!userService) return

    setIsSavingSettings(true)
    try {
      const response = await userService.updateSettings(settingsForm)
      if (response.success) {
        setSettings(response.data)
        toast.success("Settings updated successfully!")
      } else {
        throw new Error(response.message || "Failed to update settings")
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
      toast.error(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleBack = () => {
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Preferences
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal information and professional details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email address"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </Label>
                      <Input
                        id="location"
                        value={profileForm.location}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Enter your location"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title" className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Professional Title
                    </Label>
                    <Input
                      id="title"
                      value={profileForm.title}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Software Engineer, Product Manager"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleProfileSave}
                      disabled={isSavingProfile}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSavingProfile ? "Saving..." : "Save Profile"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Application Preferences
                  </CardTitle>
                  <CardDescription>
                    Customize your ATS Pro experience.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Theme</Label>
                      <Select 
                        value={settingsForm.theme} 
                        onValueChange={(value: 'light' | 'dark' | 'system') => 
                          setSettingsForm(prev => ({ ...prev, theme: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Default Privacy</Label>
                      <Select 
                        value={settingsForm.preferences.default_privacy} 
                        onValueChange={(value: 'public' | 'private') => 
                          setSettingsForm(prev => ({ 
                            ...prev, 
                            preferences: { ...prev.preferences, default_privacy: value }
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-optimize resumes</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically suggest optimizations for new job applications
                        </p>
                      </div>
                      <Switch
                        checked={settingsForm.preferences.auto_optimize}
                        onCheckedChange={(checked) =>
                          setSettingsForm(prev => ({ 
                            ...prev, 
                            preferences: { ...prev.preferences, auto_optimize: checked }
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Save drafts automatically</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically save your work as you edit
                        </p>
                      </div>
                      <Switch
                        checked={settingsForm.preferences.save_drafts}
                        onCheckedChange={(checked) =>
                          setSettingsForm(prev => ({ 
                            ...prev, 
                            preferences: { ...prev.preferences, save_drafts: checked }
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSettingsSave}
                      disabled={isSavingSettings}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSavingSettings ? "Saving..." : "Save Preferences"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Settings
                  </CardTitle>
                  <CardDescription>
                    Choose how you want to be notified about important events.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch
                        checked={settingsForm.notifications.email}
                        onCheckedChange={(checked) =>
                          setSettingsForm(prev => ({ 
                            ...prev, 
                            notifications: { ...prev.notifications, email: checked }
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Push notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive push notifications in your browser
                        </p>
                      </div>
                      <Switch
                        checked={settingsForm.notifications.push}
                        onCheckedChange={(checked) =>
                          setSettingsForm(prev => ({ 
                            ...prev, 
                            notifications: { ...prev.notifications, push: checked }
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>SMS notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive important alerts via SMS
                        </p>
                        <Badge variant="secondary" className="text-xs">Premium Feature</Badge>
                      </div>
                      <Switch
                        checked={settingsForm.notifications.sms}
                        onCheckedChange={(checked) =>
                          setSettingsForm(prev => ({ 
                            ...prev, 
                            notifications: { ...prev.notifications, sms: checked }
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSettingsSave}
                      disabled={isSavingSettings}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSavingSettings ? "Saving..." : "Save Notifications"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security & Privacy
                  </CardTitle>
                  <CardDescription>
                    Manage your account security and privacy settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Security features are managed through your authentication provider. 
                      Contact support if you need to update security settings.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base">Account Status</Label>
                        <p className="text-sm text-muted-foreground">
                          Your account is active and secure
                        </p>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base">Email Verification</Label>
                        <p className="text-sm text-muted-foreground">
                          Your email address is verified
                        </p>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base">Data Privacy</Label>
                        <p className="text-sm text-muted-foreground">
                          Your data is encrypted and secure
                        </p>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        Protected
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}