import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTableSchema } from "@shared/schema";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddTableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TableFormData = z.infer<typeof insertTableSchema>;

export default function AddTableModal({ isOpen, onClose }: AddTableModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<TableFormData>({
    resolver: zodResolver(insertTableSchema),
    defaultValues: {
      name: "",
      type: "regular",
      status: "available",
    },
  });

  // Add table mutation
  const addTableMutation = useMutation({
    mutationFn: async (data: TableFormData) => {
      const response = await apiRequest("POST", "/api/tables", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      onClose();
      form.reset();
      toast({
        title: "Thành công",
        description: "Đã thêm bàn mới",
      });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể thêm bàn mới",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: TableFormData) => {
    await addTableMutation.mutateAsync(data);
  };

  const tableTypes = [
    { value: "regular", label: "Bàn thường" },
    { value: "vip", label: "Phòng VIP" },
    { value: "special", label: "Đặc biệt" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="bg-primary text-primary-foreground p-4 -m-6 mb-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Thêm bàn mới</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên bàn</FormLabel>
                  <FormControl>
                    <Input placeholder="Ví dụ: Bàn 23, Phòng VIP 11..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại bàn</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại bàn" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tableTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={addTableMutation.isPending}
                className="flex-1"
              >
                {addTableMutation.isPending ? "Đang thêm..." : "Thêm bàn"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Hủy
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}