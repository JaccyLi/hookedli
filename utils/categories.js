/**
 * Fly Fishing Categories Configuration
 * Add or modify categories here - they will be used across the app
 */

const categories = {
  en: {
    all: 'Random',
    'fly tying': 'FlyTying',
    'fly casting': 'FlyCasting',
    'biology': 'AnglingBio',
    'gear': 'Gear',
    'conservation': 'Conservation',
    'orvis': 'Orvis',
    'winston': 'Winston',
    'sage': 'Sage',
    'redington': 'Redington',
    'rio': 'Rio',
    'scientific anglers': 'SA',
    'steelhead': 'Steelhead',
    'bass': 'Bass',
    'saltwater': 'Saltwater',
    'tenkara': 'Tenkara'
  },
  zh: {
    all: '随机',
    'fly tying': '毛钩',
    'fly casting': '抛投',
    'biology': '飞钓生物学',
    'gear': '装备',
    'conservation': '生态保护',
    'orvis': 'Orvis',
    'winston': 'Winston',
    'sage': 'Sage',
    'redington': 'Redington',
    'rio': 'Rio',
    'scientific anglers': 'SA',
    'steelhead': '钢头鳟',
    'bass': '鲈鱼',
    'saltwater': '海飞',
    'tenkara': '天展'
  }
}

const categoryLabels = {
  en: {
    all: 'Fly Fishing',
    'fly tying': 'Fly Tying',
    'fly casting': 'Fly Casting',
    'biology': 'Angling Biology',
    'gear': 'Gear Tips',
    'conservation': 'Conservation',
    'orvis': 'Orvis',
    'winston': 'Winston',
    'sage': 'Sage',
    'redington': 'Redington',
    'rio': 'Rio',
    'scientific anglers': 'Scientific Anglers',
    'steelhead': 'Steelhead',
    'bass': 'Bass',
    'saltwater': 'Saltwater',
    'tenkara': 'Tenkara'
  },
  zh: {
    all: '飞钓',
    'fly tying': '毛钩绑制',
    'fly casting': '飞钓抛投',
    'biology': '飞钓生物学',
    'gear': '装备技巧',
    'conservation': '生态保护',
    'orvis': 'Orvis',
    'winston': 'Winston',
    'sage': 'Sage',
    'redington': 'Redington',
    'rio': 'Rio',
    'scientific anglers': 'Scientific Anglers',
    'steelhead': '钢头鳟',
    'bass': '鲈鱼',
    'saltwater': '海飞',
    'tenkara': '天展'
  }
}

const categoryPrompts = {
  en: {
    'fly tying': 'Fly tying patterns, techniques, and tutorials',
    'fly casting': 'Fly casting techniques, tips for distance and accuracy',
    'biology': 'Angling biology, understanding fish behavior and ecosystem dynamics',
    'gear': 'Fly fishing gear tips, equipment reviews and recommendations',
    'conservation': 'Fly fishing conservation, protecting river ecosystems, sustainable angling practices',
    'reading water': 'Reading water techniques, identifying fish holding spots, understanding current patterns',
    'presentation': 'Fly presentation techniques, drag-free drifts, accurate mends',
    'catch and release': 'Catch and release best practices, proper fish handling, survival techniques',
    'match hatch': 'Matching the hatch, insect identification, fly selection strategies',
    'wading safety': 'Wading safety tips, river crossing techniques, proper wading gear',
    'fly line': 'Fly line types, taper profiles, line selection, casting characteristics',
    'fly rod': 'Fly rod actions, rod selection, casting mechanics, rod maintenance',
    'etiquette': 'River etiquette, proper angler behavior, respecting other anglers',
    'orvis': 'Orvis fly fishing brand, Orvis history, Orvis products and innovations',
    'winston': 'Winston fly rods, Winston rod actions, Winston craftsmanship',
    'sage': 'Sage fly rods, Sage rod actions, Sage casting performance, Sage fly fishing gear',
    'redington': 'Redington fly rods, Redington fly fishing gear, Redington reels and accessories',
    'rio': 'Rio fly lines, Rio fly fishing lines, Rio shooting heads, Rio leader materials',
    'scientific anglers': 'Scientific Anglers fly lines, SA line technology, Scientific Anglers products',
    'steelhead': 'Steelhead fishing, steelhead run fishing, steelhead fly fishing techniques',
    'bass': 'Bass fly fishing, largemouth bass, smallmouth bass, warmwater fly fishing',
    'saltwater': 'Saltwater fly fishing, saltwater flats, bonefish, permit, saltwater fly patterns',
    'tenkara': 'Tenkara fishing, Japanese tenkara, tenkara rods, tenkara techniques',
    'tfo': 'TFO fly fishing brand, TFO rods and gear, Temple Fork Outfitters',
    'echo': 'Echo fly rods, Echo rod technologies, Echo casting performance',
    'lefty kreh': 'Lefty Kreh fly fishing techniques, Lefty Kreh casting methods, Lefty Kreh legacy',
    'steve rajeff': 'Steve Rajeff casting techniques, Steve Rajeff championship wins, Rajeff fishing methods',
    'all': 'Fly fishing techniques, tips, and advice'
  },
  zh: {
    'fly tying': '毛钩绑制模式、技术和教程',
    'fly casting': '飞钓抛投技巧、距离和准确性的建议',
    'biology': '飞钓生物学、理解鱼类行为和生态系统',
    'gear': '飞钓装备技巧、设备评论和建议',
    'conservation': '飞钓保护、河流生态系统保护、可持续垂钓实践',
    'reading water': '读水技巧、识别鱼类栖息地、理解水流模式',
    'presentation': '飞钓呈现技巧、无阻力随挥、准确修线',
    'catch and release': '钓获放流最佳实践、正确鱼类处理、存活技巧',
    'match hatch': '钩饵匹配、昆虫识别、飞饵选择策略',
    'wading safety': '涉水安全技巧、河流穿越技巧、适当涉水装备',
    'fly line': '飞钓主线类型、锥度轮廓、主线选择、抛投特性',
    'fly rod': '飞钓竿动作、鱼竿选择、抛投力学、鱼竿维护',
    'etiquette': '河流礼仪、正确垂钓行为、尊重其他垂钓者',
    'orvis': 'Orvis飞钓品牌、Orvis历史、Orvis产品和创新',
    'winston': 'Winston飞钓竿、Winston鱼竿动作、Winston工艺',
    'sage': 'Sage飞钓竿、Sage鱼竿动作、Sage抛投性能、Sage飞钓装备',
    'redington': 'Redington飞钓竿、Redington飞钓装备、Redington渔轮和配件',
    'rio': 'Rio飞钓主线、Rio飞钓线、Rio抛投头、Rio子线材料',
    'scientific anglers': 'Scientific Anglers飞钓主线、SA线技术、Scientific Anglers产品',
    'steelhead': '钢头鳟钓鱼、钢头鳟洄游钓法、钢头鳟飞钓技术',
    'bass': '鲈鱼飞钓、大口黑鲈、小口黑鲈、温水飞钓',
    'saltwater': '海水飞钓、盐水浅滩、bonefish、permit、海水飞蝇模式',
    'tenkara': '天展钓法、日本天展、天展竿、天展技术',
    'tfo': 'TFO飞钓品牌、TFO鱼竿和装备、Temple Fork Outfitters',
    'echo': 'Echo飞钓竿、Echo鱼竿技术、Echo抛投性能',
    'lefty kreh': 'Lefty Kreh飞钓技巧、Lefty Kreh抛投方法、Lefty Kreh遗产',
    'steve rajeff': 'Steve Rajeff抛投技巧、Steve Rajeff冠军胜利、Rajeff垂钓方法',
    'all': '飞钓技术、技巧和建议'
  }
}

module.exports = {
  categories,
  categoryLabels,
  categoryPrompts
}
