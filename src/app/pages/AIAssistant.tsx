import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Lightbulb,
  Calendar,
  DollarSign,
  TrendingUp
} from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI assistant for ElectroCRM. I can help you with scheduling, customer insights, estimate generation, and business optimization. What would you like help with today?",
      timestamp: new Date(),
      suggestions: [
        "Analyze my revenue trends",
        "Schedule optimization for next week",
        "Generate estimate for panel upgrade",
        "Customer retention recommendations"
      ]
    }
  ]);
  const [input, setInput] = useState("");

  const quickActions = [
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Optimize your calendar based on location and job type",
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: DollarSign,
      title: "Estimate Generator",
      description: "Create detailed estimates using AI and historical data",
      color: "bg-green-100 text-green-600"
    },
    {
      icon: TrendingUp,
      title: "Revenue Insights",
      description: "Get predictions and recommendations for growth",
      color: "bg-purple-100 text-purple-600"
    },
    {
      icon: Lightbulb,
      title: "Customer Insights",
      description: "Identify upsell opportunities and retention risks",
      color: "bg-orange-100 text-orange-600"
    }
  ];

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getAIResponse(input),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);

    setInput("");
  };

  const getAIResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('revenue') || lowerQuery.includes('income')) {
      return "Based on your revenue data, I see a strong upward trend! Your revenue has increased by 12.5% over the last month to $32,000. The main growth drivers are:\n\n1. Commercial installations (+40%)\n2. Electrical upgrades (+25%)\n3. New customer acquisitions\n\nRecommendation: Focus marketing on commercial properties and panel upgrades, as these have the highest profit margins.";
    }

    if (lowerQuery.includes('schedule') || lowerQuery.includes('calendar')) {
      return "I've analyzed your schedule for optimal efficiency. Here are my recommendations:\n\n1. Group jobs by location to reduce travel time (could save 4 hours/week)\n2. Schedule maintenance jobs on Mondays/Fridays when emergency calls are lower\n3. You have capacity for 2 more jobs next week\n\nWould you like me to suggest specific time slots for your pending estimates?";
    }

    if (lowerQuery.includes('estimate') || lowerQuery.includes('quote')) {
      return "I can help generate an estimate! For a typical electrical panel upgrade:\n\n• 200A Panel: $850\n• Circuit Breakers (8x 20A): $360\n• Labor (6 hours @ $125/hr): $750\n• Permit & Inspection: $350\n• Subtotal: $2,310\n• Tax (8%): $184.80\n• Total: $2,494.80\n\nThis is based on your historical pricing. Would you like to adjust any items or create a custom estimate?";
    }

    if (lowerQuery.includes('customer')) {
      return "Looking at your customer data:\n\n• Johnson Residence is due for maintenance (8 months since last service)\n• Springfield Mall shows high satisfaction and regularly approves add-on work\n• 3 customers haven't scheduled follow-ups in 6+ months\n\nRecommendation: Send a seasonal maintenance reminder to inactive customers with a 10% discount to boost retention.";
    }

    return "I'd be happy to help with that! I can assist you with:\n\n• Revenue analysis and forecasting\n• Smart scheduling and route optimization\n• Generating detailed estimates\n• Customer insights and retention\n• Business growth recommendations\n\nWhat specific area would you like to explore?";
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-purple-600" />
            AI Assistant
          </h1>
          <p className="text-gray-500 mt-1">Your intelligent business partner</p>
        </div>
        <Badge className="bg-purple-100 text-purple-700 border-purple-300">
          Powered by AI
        </Badge>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${action.color} mb-3`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chat Interface */}
      <Card className="flex flex-col h-[600px]">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-600" />
            Chat with AI
          </CardTitle>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-purple-600" />
                </div>
              )}

              <div className={`flex flex-col max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                </div>

                {message.suggestions && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.suggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant="outline"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}

                <span className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
              )}
            </div>
          ))}
        </CardContent>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Ask me anything about your business..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* AI Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle>What I Can Do</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Business Intelligence</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Revenue forecasting and trend analysis</li>
                <li>• Profit margin optimization</li>
                <li>• Seasonal pattern recognition</li>
                <li>• Competitive pricing insights</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Workflow Automation</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Smart job scheduling</li>
                <li>• Automated estimate generation</li>
                <li>• Route optimization</li>
                <li>• Customer follow-up reminders</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Customer Management</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Churn prediction and prevention</li>
                <li>• Upsell opportunity identification</li>
                <li>• Satisfaction analysis</li>
                <li>• Personalized communication</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Technical Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Code compliance checking</li>
                <li>• Material recommendations</li>
                <li>• Safety protocol reminders</li>
                <li>• Troubleshooting assistance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
