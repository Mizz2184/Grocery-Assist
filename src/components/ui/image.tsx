import { cn } from "@/lib/utils";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fill?: boolean;
}

export const Image = ({ className, fill, ...props }: ImageProps) => {
  return (
    <img
      className={cn(
        "max-w-full h-auto",
        fill && "absolute inset-0 w-full h-full object-cover",
        className
      )}
      {...props}
    />
  );
}; 