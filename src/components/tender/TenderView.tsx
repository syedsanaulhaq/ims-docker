import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Package } from 'lucide-react';

interface Tender {
  id: string;
  code: string;
  name: string;
  date: string;
  totalVendors: number;
  totalItems: number;
  vendors?: any[];
  items?: any[];
}

interface TenderViewProps {
  tender: Tender;
  onClose: () => void;
}

const TenderView: React.FC<TenderViewProps> = ({ tender, onClose }) => {
  const [categoryMap, setCategoryMap] = useState<{ [key: string]: string }>({});
  const [fullTender, setFullTender] = useState<Tender>(tender);
  const [loading, setLoading] = useState(true);

  // Fetch full tender details with vendors and items
  useEffect(() => {
    const fetchTenderDetails = async () => {
      try {
        const response = await fetch(`/api/tenders/${tender.id}`);
        if (response.ok) {
          const data = await response.json();
          setFullTender(data);
        } else {
          console.error('❌ Failed to fetch tender details:', response.status);
        }
      } catch (error) {
        console.error('❌ Error fetching tender details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTenderDetails();
  }, [tender.id]);

  // Fetch category names to map IDs to names
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        const categories = await response.json();
        
        // Create a map of category_id -> category_name
        const map: { [key: string]: string } = {};
        
        // Handle both array and wrapped response
        const catArray = Array.isArray(categories) ? categories : (categories.categories || []);
        
        catArray.forEach((cat: any) => {
          // Try multiple possible property names for the category name
          const categoryName = cat.name || cat.category_name || cat.nomenclature || 'Unknown';
          map[cat.id] = categoryName;
          });
        
        setCategoryMap(map);
      } catch (error) {
        console.error('❌ Failed to fetch categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Group items by vendor, then by category
  const groupedByVendor = fullTender.vendors ? 
    fullTender.vendors.map(vendor => ({
      ...vendor,
      items: fullTender.items?.filter((item: any) => item.vendor_id === vendor.id) || []
    })) || []
    : [];

  // Get category name from ID, fallback to ID if not found
  const getCategoryName = (categoryId: string) => {
    return categoryMap[categoryId] || categoryId;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <Button onClick={onClose} variant="outline" className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      {loading && (
        <div className="text-center py-8 text-gray-500">
          Loading tender details...
        </div>
      )}

      {!loading && (
        <>
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">{fullTender.name}</h1>
            <p className="text-gray-600 mt-1">Code: <span className="font-mono font-bold text-blue-600">{fullTender.code}</span></p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Tender Code</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{fullTender.code}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Date(fullTender.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: '2-digit'
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Vendors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{fullTender.totalVendors}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{fullTender.totalItems}</div>
            </CardContent>
          </Card>
        </div>

        {/* Vendors Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Vendors ({fullTender.totalVendors})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="py-2 px-3 text-left font-semibold">Vendor Name</th>
                    <th className="py-2 px-3 text-left font-semibold">Contact</th>
                    <th className="py-2 px-3 text-left font-semibold">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {fullTender.vendors && fullTender.vendors.length > 0 ? (
                    (() => {
                      return fullTender.vendors.map((vendor, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium">{vendor.vendor_name || vendor.name}</td>
                          <td className="py-2 px-3">{vendor.contact_person || vendor.contact || 'N/A'}</td>
                          <td className="py-2 px-3 text-blue-600">{vendor.email || 'N/A'}</td>
                        </tr>
                      ));
                    })()
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-500">
                        No vendors added
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Items by Vendor */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Items ({fullTender.totalItems})
          </h2>

          {groupedByVendor.length > 0 ? (
            groupedByVendor.map(vendor => (
              <Card key={vendor.id}>
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-lg text-blue-900">{vendor.vendor_name || vendor.name}</CardTitle>
                  <p className="text-sm text-blue-700 mt-1">{vendor.items?.length || 0} item(s)</p>
                </CardHeader>
                <CardContent className="pt-4">
                  {vendor.items && vendor.items.length > 0 ? (
                    <div className="space-y-3">
                      {(() => {
                        // Group items by category for this vendor
                        const itemsByCategory: { [key: string]: any[] } = {};
                        vendor.items.forEach((item: any) => {
                          if (!itemsByCategory[item.category]) {
                            itemsByCategory[item.category] = [];
                          }
                          itemsByCategory[item.category].push(item);
                        });

                        return Object.entries(itemsByCategory).map(([categoryId, items]: [string, any[]]) => (
                          <div key={categoryId}>
                            <p className="font-semibold text-sm text-gray-700 mb-2">{getCategoryName(categoryId)}</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b bg-gray-50">
                                    <th className="text-left py-2 px-3 font-semibold">Item Name</th>
                                    <th className="text-center py-2 px-3 font-semibold">Quantity</th>
                                    <th className="text-center py-2 px-3 font-semibold">Unit</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((item, idx) => (
                                    <tr key={idx} className="border-b hover:bg-gray-50">
                                      <td className="py-2 px-3">{item.name}</td>
                                      <td className="py-2 px-3 text-center">
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">
                                          {item.quantity}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-center text-gray-600">{item.unit}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No items assigned</p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No vendors or items in this tender
              </CardContent>
            </Card>
          )}
        </div>
        </>
      )}
    </div>
  );
};

export default TenderView;

