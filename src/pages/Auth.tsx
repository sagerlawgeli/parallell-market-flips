import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useNavigate } from 'react-router-dom'
import { LogIn, AlertCircle } from 'lucide-react'

export default function AuthPage() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error
            navigate('/')
        } catch (error: any) {
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card className="border-0 shadow-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />

                    <CardHeader className="relative space-y-3 text-center pb-6">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2"
                        >
                            <LogIn className="h-8 w-8 text-primary" />
                        </motion.div>
                        <CardTitle className="text-3xl font-bold">
                            <span className="text-primary">Arbitrage</span> Ledger
                        </CardTitle>
                        <CardDescription className="text-base">
                            Enter your credentials to access your ledger
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="relative">
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-12 text-base rounded-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium">
                                    Password
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-12 text-base rounded-xl"
                                />
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                                >
                                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                                    <span className="text-sm text-red-500 font-medium">
                                        {error}
                                    </span>
                                </motion.div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-12 text-base rounded-xl font-semibold"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        Signing in...
                                    </div>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
