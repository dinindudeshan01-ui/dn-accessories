const db = require('./db')

const products = [
  {
    name: 'CHARMED Beaded Bracelet',
    price: 12.00,
    description: 'Handcrafted beaded bracelet with signature charm. Stretchy, durable, and beautifully finished.',
    image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=800',
    category: 'charmed',
    stock: 15
  },
  {
    name: 'PLAIN Beaded Bracelet',
    price: 9.00,
    description: 'Clean, minimal beaded bracelet in a range of colors. Perfect for stacking.',
    image_url: 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&q=80&w=800',
    category: 'plain',
    stock: 20
  },
  {
    name: 'Signature Charm Bracelet',
    price: 18.00,
    description: 'Our signature piece. 7-inch stretch bracelet loaded with premium charms.',
    image_url: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&q=80&w=800',
    category: 'signature',
    stock: 8
  },
  {
    name: 'Charm Bangle',
    price: 15.00,
    description: 'Elegant bangle with dangling charms. One size fits most.',
    image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800',
    category: 'bangle',
    stock: 12
  },
  {
  name: 'Premium Crafting String (0.8mm)',
  price: 8.00,
  description: 'The foundation of every D&N masterpiece. High-quality stretch string, professional grade.',
  image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=800',
  category: 'supplies',
  stock: 0
},
  {
    name: 'Gold Charm Set',
    price: 22.00,
    description: 'Set of 6 gold-tone charms. Mix and match to create your perfect bracelet.',
    image_url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=800',
    category: 'charmed',
    stock: 10
  },
]

db.prepare('DELETE FROM products').run()

const insert = db.prepare(`
  INSERT INTO products (name, price, description, image_url, category, stock)
  VALUES (@name, @price, @description, @image_url, @category, @stock)
`)

for (const product of products) {
  insert.run(product)
}

console.log(`✅ Seeded ${products.length} products`)
process.exit(0)