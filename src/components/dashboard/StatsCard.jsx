
import React from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { motion } from "framer-motion";

const colorSchemes = {
  purple: {
    bg: "from-[#860063] via-[#a0007d] to-[#c10097]",
    border: "border-[#860063]/40",
    glow: "shadow-[0_0_30px_rgba(134,0,99,0.4)]",
    icon: "bg-gradient-to-br from-[#860063] to-[#c10097]",
    iconText: "text-white",
    shimmer: "from-[#860063]/30 via-[#c10097]/50 to-[#860063]/30"
  },
  orange: {
    bg: "from-[#F88D2A] via-[#ff9d3d] to-[#ffb05a]",
    border: "border-[#F88D2A]/40",
    glow: "shadow-[0_0_30px_rgba(248,141,42,0.4)]",
    icon: "bg-gradient-to-br from-[#F88D2A] to-[#ffb05a]",
    iconText: "text-white",
    shimmer: "from-[#F88D2A]/30 via-[#ffb05a]/50 to-[#F88D2A]/30"
  },
  blue: {
    bg: "from-blue-500 via-blue-600 to-cyan-500",
    border: "border-blue-500/40",
    glow: "shadow-[0_0_30px_rgba(59,130,246,0.4)]",
    icon: "bg-gradient-to-br from-blue-500 to-cyan-500",
    iconText: "text-white",
    shimmer: "from-blue-500/30 via-cyan-500/50 to-blue-500/30"
  },
  green: {
    bg: "from-green-500 via-emerald-500 to-teal-500",
    border: "border-green-500/40",
    glow: "shadow-[0_0_30px_rgba(34,197,94,0.4)]",
    icon: "bg-gradient-to-br from-green-500 to-teal-500",
    iconText: "text-white",
    shimmer: "from-green-500/30 via-teal-500/50 to-green-500/30"
  }
};

export default function StatsCard({ title, value, icon: Icon, color = "purple", trend, subtitle }) {
  const scheme = colorSchemes[color];

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Card className={`relative overflow-hidden h-full border-2 ${scheme.border} ${scheme.glow} transition-all duration-300 backdrop-blur-xl bg-white/80 hover:bg-white/90 group`}>
        {/* Animated gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${scheme.bg} opacity-10 group-hover:opacity-15 transition-opacity duration-300`} />
        
        {/* Shimmer effect */}
        <motion.div
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 2
          }}
          className={`absolute inset-0 bg-gradient-to-r ${scheme.shimmer} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
          style={{
            transform: 'skewX(-20deg)',
          }}
        />

        {/* Floating orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${scheme.bg} blur-2xl`}
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className={`absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-gradient-to-br ${scheme.bg} blur-2xl`}
        />

        <CardHeader className="p-3 md:p-4 relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-600 mb-1 truncate uppercase tracking-wide">{title}</p>
              <div className="flex flex-col gap-0.5">
                <h3 className="text-xl md:text-2xl lg:text-3xl font-black bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  {value}
                </h3>
                {subtitle && (
                  <span className="text-xs text-gray-500 font-medium">{subtitle}</span>
                )}
              </div>
            </div>
            <motion.div
              whileHover={{ rotate: 360, scale: 1.15 }}
              transition={{ duration: 0.5 }}
              className={`p-2 md:p-3 rounded-2xl ${scheme.icon} shadow-lg flex-shrink-0`}
            >
              <Icon className={`w-4 h-4 md:w-6 md:h-6 ${scheme.iconText} drop-shadow-md`} />
            </motion.div>
          </div>
          
          {trend && (
            <div className="flex items-center gap-2 text-xs">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className={`h-1 rounded-full bg-gradient-to-r ${scheme.bg} shadow-sm`}
              />
              <span className="text-gray-600 whitespace-nowrap text-xs font-semibold">{trend}</span>
            </div>
          )}
        </CardHeader>
      </Card>
    </motion.div>
  );
}
