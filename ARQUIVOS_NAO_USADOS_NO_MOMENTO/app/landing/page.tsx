import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChefHat, BookOpen, Users, Calendar, Search, Heart, Star, TrendingUp } from "lucide-react"
import { Link } from "react-router-dom"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-cream/95 backdrop-blur-sm border-b border-terracotta/10 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <ChefHat className="h-8 w-8 text-terracotta" />
              <span className="font-serif text-2xl font-bold text-charcoal">Allka 2026</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link to="#features" className="text-charcoal hover:text-terracotta transition-colors">
                Features
              </Link>
              <Link to="#community" className="text-charcoal hover:text-terracotta transition-colors">
                Community
              </Link>
              <Link to="#pricing" className="text-charcoal hover:text-terracotta transition-colors">
                Pricing
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="text-charcoal hover:text-terracotta hover:bg-terracotta/10">
                Sign In
              </Button>
              <Button className="bg-terracotta hover:bg-terracotta/90 text-cream">Get Started</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-sage/20 rounded-full">
                <Star className="h-4 w-4 text-terracotta fill-terracotta" />
                <span className="text-sm font-medium text-charcoal">Join 50,000+ home cooks</span>
              </div>
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-charcoal leading-tight text-balance">
                Your Kitchen, Your Stories, Your Community
              </h1>
              <p className="text-xl text-charcoal/70 leading-relaxed text-pretty">
                Discover, organize, and share recipes that bring people together. Allka 2026 is where culinary
                creativity meets community connection.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-terracotta hover:bg-terracotta/90 text-cream text-lg px-8 py-6">
                  Start Cooking Free
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-charcoal text-charcoal hover:bg-charcoal hover:text-cream text-lg px-8 py-6 bg-transparent"
                >
                  Watch Demo
                </Button>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-sage border-2 border-cream flex items-center justify-center text-cream font-semibold"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-5 w-5 text-terracotta fill-terracotta" />
                    ))}
                  </div>
                  <p className="text-sm text-charcoal/60 mt-1">4.9/5 from 2,000+ reviews</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-3xl overflow-hidden bg-sage/20">
                <img
                  src="/placeholder.svg?height=600&width=600"
                  alt="Recipe collection"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-cream p-6 rounded-2xl shadow-xl border border-terracotta/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-terracotta flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-cream" />
                  </div>
                  <div>
                    <p className="font-semibold text-charcoal">500+ Recipes</p>
                    <p className="text-sm text-charcoal/60">Added this week</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-charcoal mb-4 text-balance">
              Everything You Need to Cook with Confidence
            </h2>
            <p className="text-xl text-charcoal/70 max-w-2xl mx-auto text-pretty">
              From recipe organization to meal planning, we've got all the tools to make your cooking journey
              delightful.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 border-2 border-sage/20 hover:border-sage transition-colors bg-cream">
              <div className="w-14 h-14 rounded-2xl bg-terracotta/10 flex items-center justify-center mb-6">
                <BookOpen className="h-7 w-7 text-terracotta" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-charcoal mb-3">Smart Organization</h3>
              <p className="text-charcoal/70 leading-relaxed">
                Keep all your recipes in one place with intelligent tagging, categories, and custom collections that
                make finding the perfect dish effortless.
              </p>
            </Card>

            <Card className="p-8 border-2 border-sage/20 hover:border-sage transition-colors bg-cream">
              <div className="w-14 h-14 rounded-2xl bg-sage/20 flex items-center justify-center mb-6">
                <Search className="h-7 w-7 text-sage" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-charcoal mb-3">Discover & Explore</h3>
              <p className="text-charcoal/70 leading-relaxed">
                Find inspiration from thousands of recipes shared by our community. Filter by cuisine, dietary needs,
                cooking time, and more.
              </p>
            </Card>

            <Card className="p-8 border-2 border-sage/20 hover:border-sage transition-colors bg-cream">
              <div className="w-14 h-14 rounded-2xl bg-terracotta/10 flex items-center justify-center mb-6">
                <Calendar className="h-7 w-7 text-terracotta" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-charcoal mb-3">Meal Planning</h3>
              <p className="text-charcoal/70 leading-relaxed">
                Plan your week ahead with our intuitive meal planner. Generate shopping lists automatically and never
                forget an ingredient.
              </p>
            </Card>

            <Card className="p-8 border-2 border-sage/20 hover:border-sage transition-colors bg-cream">
              <div className="w-14 h-14 rounded-2xl bg-sage/20 flex items-center justify-center mb-6">
                <Users className="h-7 w-7 text-sage" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-charcoal mb-3">Community Sharing</h3>
              <p className="text-charcoal/70 leading-relaxed">
                Share your culinary creations with food lovers worldwide. Get feedback, tips, and connect with fellow
                cooking enthusiasts.
              </p>
            </Card>

            <Card className="p-8 border-2 border-sage/20 hover:border-sage transition-colors bg-cream">
              <div className="w-14 h-14 rounded-2xl bg-terracotta/10 flex items-center justify-center mb-6">
                <Heart className="h-7 w-7 text-terracotta" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-charcoal mb-3">Save Favorites</h3>
              <p className="text-charcoal/70 leading-relaxed">
                Bookmark recipes you love and build your personal cookbook. Rate and review dishes to help others
                discover great food.
              </p>
            </Card>

            <Card className="p-8 border-2 border-sage/20 hover:border-sage transition-colors bg-cream">
              <div className="w-14 h-14 rounded-2xl bg-sage/20 flex items-center justify-center mb-6">
                <ChefHat className="h-7 w-7 text-sage" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-charcoal mb-3">Cooking Mode</h3>
              <p className="text-charcoal/70 leading-relaxed">
                Step-by-step cooking instructions with voice commands and timers. Keep your device clean while you
                create magic in the kitchen.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="py-20 px-4 sm:px-6 lg:px-8 bg-sage/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Card className="p-6 bg-cream border-sage/20">
                    <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-terracotta/10">
                      <img
                        src="/placeholder.svg?height=300&width=300"
                        alt="Recipe"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="font-semibold text-charcoal mb-1">Creamy Pasta</h4>
                    <p className="text-sm text-charcoal/60">by Sarah K.</p>
                    <div className="flex items-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="h-4 w-4 text-terracotta fill-terracotta" />
                      ))}
                    </div>
                  </Card>
                  <Card className="p-6 bg-cream border-sage/20">
                    <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-sage/10">
                      <img
                        src="/placeholder.svg?height=300&width=300"
                        alt="Recipe"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="font-semibold text-charcoal mb-1">Garden Salad</h4>
                    <p className="text-sm text-charcoal/60">by Mike R.</p>
                    <div className="flex items-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="h-4 w-4 text-terracotta fill-terracotta" />
                      ))}
                    </div>
                  </Card>
                </div>
                <div className="space-y-4 pt-8">
                  <Card className="p-6 bg-cream border-sage/20">
                    <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-terracotta/10">
                      <img
                        src="/placeholder.svg?height=300&width=300"
                        alt="Recipe"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="font-semibold text-charcoal mb-1">Chocolate Delight</h4>
                    <p className="text-sm text-charcoal/60">by Emma L.</p>
                    <div className="flex items-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="h-4 w-4 text-terracotta fill-terracotta" />
                      ))}
                    </div>
                  </Card>
                  <Card className="p-6 bg-cream border-sage/20">
                    <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-sage/10">
                      <img
                        src="/placeholder.svg?height=300&width=300"
                        alt="Recipe"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="font-semibold text-charcoal mb-1">Artisan Bread</h4>
                    <p className="text-sm text-charcoal/60">by Tom H.</p>
                    <div className="flex items-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="h-4 w-4 text-terracotta fill-terracotta" />
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-6">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-charcoal text-balance">
                Join a Thriving Community of Food Lovers
              </h2>
              <p className="text-xl text-charcoal/70 leading-relaxed text-pretty">
                Connect with passionate home cooks, share your favorite recipes, and discover new culinary adventures
                every day. Our community is built on the love of good food and great company.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-terracotta" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-charcoal mb-1">50,000+ Active Members</h4>
                    <p className="text-charcoal/70">A vibrant community sharing recipes daily</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-sage/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-6 w-6 text-sage" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-charcoal mb-1">100,000+ Recipes</h4>
                    <p className="text-charcoal/70">From quick weeknight dinners to gourmet feasts</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                    <Heart className="h-6 w-6 text-terracotta" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-charcoal mb-1">1M+ Recipe Saves</h4>
                    <p className="text-charcoal/70">Dishes loved and saved by our community</p>
                  </div>
                </div>
              </div>
              <Button size="lg" className="bg-terracotta hover:bg-terracotta/90 text-cream">
                Join the Community
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-terracotta">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-cream text-balance">
            Ready to Transform Your Cooking Experience?
          </h2>
          <p className="text-xl text-cream/90 text-pretty">
            Join thousands of home cooks who are already organizing, discovering, and sharing amazing recipes on Allka
            2026.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-cream text-terracotta hover:bg-cream/90 text-lg px-8 py-6 font-semibold">
              Get Started for Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-cream text-cream hover:bg-cream/10 text-lg px-8 py-6 bg-transparent"
            >
              View Pricing
            </Button>
          </div>
          <p className="text-cream/80 text-sm">No credit card required • Free forever plan available</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal text-cream py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ChefHat className="h-8 w-8 text-terracotta" />
                <span className="font-serif text-2xl font-bold">Allka 2026</span>
              </div>
              <p className="text-cream/70 text-sm">
                Your kitchen companion for recipe management and culinary inspiration.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-cream/70">
                <li>
                  <Link to="#" className="hover:text-terracotta transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-terracotta transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-terracotta transition-colors">
                    Mobile App
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-sm text-cream/70">
                <li>
                  <Link to="#" className="hover:text-terracotta transition-colors">
                    Recipes
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-terracotta transition-colors">
                    Cooks
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-terracotta transition-colors">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-cream/70">
                <li>
                  <Link to="#" className="hover:text-terracotta transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-terracotta transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:text-terracotta transition-colors">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-cream/10 pt-8 text-center text-sm text-cream/60">
            <p>© 2026 Allka. All rights reserved. Made with ❤️ for food lovers everywhere.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
