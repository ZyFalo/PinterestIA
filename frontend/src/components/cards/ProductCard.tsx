import { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <a
      href={product.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer">
        <div className="h-[240px] overflow-hidden bg-bg-muted">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-tertiary text-[13px]">
              Sin imagen
            </div>
          )}
        </div>
        <div className="p-4">
          <h4 className="font-medium text-[14px] text-text-primary truncate">
            {product.name}
          </h4>
          {product.price && (
            <p className="text-[17px] font-bold text-accent-red mt-1">
              {product.price}
            </p>
          )}
          {product.store && (
            <p className="text-[12px] text-text-secondary mt-1">
              {product.store}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}
