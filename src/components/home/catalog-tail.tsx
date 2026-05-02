import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/api";

export default function CatalogTail({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <section className="container-rhode py-24">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
