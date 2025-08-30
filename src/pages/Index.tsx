import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Users, Heart, TrendingUp, Globe, Building2, UserPlus, Shield } from "lucide-react";
import SEO from "@/components/SEO";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <SEO 
        title="VITANA - AI-Powered Health & Wellness Platform" 
        description="Transform your health journey with VITANA's comprehensive AI-powered platform featuring personalized coaching, community support, and advanced health tracking."
      />
      
      {/* Navigation */}
      <nav className="px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Heart className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              VITANA
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" asChild>
              <Link to="/auth-workspace?action=join">Sign In</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin-bootstrap" className="text-orange-600 hover:text-orange-700">
                <Shield className="h-4 w-4 mr-1" />
                Admin Setup
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-6">
              Transform Your Health Journey
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Experience the future of wellness with our AI-powered platform that combines personalized coaching, 
              community support, and advanced health tracking across specialized workspaces.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <Badge variant="secondary" className="px-4 py-2">🤖 AI-Powered Coaching</Badge>
              <Badge variant="secondary" className="px-4 py-2">📊 Advanced Analytics</Badge>
              <Badge variant="secondary" className="px-4 py-2">🌐 Global Community</Badge>
              <Badge variant="secondary" className="px-4 py-2">🔒 Privacy First</Badge>
            </div>
          </div>

          {/* Workspace Cards */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Choose Your Workspace</h2>
            <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Access specialized platforms designed for different aspects of your wellness journey
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Maxina Workspace */}
              <Card className="hover:shadow-xl transition-all duration-300 border-purple-200">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <Building2 className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl">Maxina</CardTitle>
                  <CardDescription>
                    Advanced AI-powered health optimization and personalized wellness coaching platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
                    <Link to="/auth-workspace?tenant=maxina&action=join">
                      Request Access
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Alkalma Workspace */}
              <Card className="hover:shadow-xl transition-all duration-300 border-green-200">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Heart className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle className="text-xl">Alkalma</CardTitle>
                  <CardDescription>
                    Holistic wellness community focused on mind-body balance and sustainable health practices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full border-green-200 text-green-600 hover:bg-green-50">
                    <Link to="/auth-workspace?tenant=alkalma&action=join">
                      Request Access
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Earthlings Workspace */}
              <Card className="hover:shadow-xl transition-all duration-300 border-blue-200">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Globe className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">Earthlings</CardTitle>
                  <CardDescription>
                    Global community connecting health enthusiasts worldwide for shared wellness journeys
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50">
                    <Link to="/auth-workspace?tenant=earthlings&action=join">
                      Request Access
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Analytics</h3>
              <p className="text-gray-600">Track your progress with AI-powered insights and personalized recommendations</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Global Community</h3>
              <p className="text-gray-600">Connect with like-minded individuals on similar wellness journeys</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Holistic Approach</h3>
              <p className="text-gray-600">Address all aspects of wellness: physical, mental, and emotional health</p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold mb-4">Ready to Start Your Journey?</h2>
            <p className="text-gray-600 mb-6">
              Join thousands of users who are already transforming their health with VITANA
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/auth-workspace?action=join">
                  Get Started Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/admin-bootstrap">
                  <Shield className="mr-2 h-5 w-5" />
                  Admin Setup
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;