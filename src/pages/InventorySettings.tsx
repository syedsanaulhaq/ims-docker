import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Package,
  Database,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface ItemMaster {
  id: string;
  nomenclature: string;
  category_name: string;
  sub_category_name: string;
  unit: string;
  minimum_stock_level: number;
  maximum_stock_level: number;
  reorder_point: number;
  specifications: string;
}

interface StockSummary {
  total_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_value: number;
}

interface DefaultSettings {
  minimum_stock_percentage: number;
  reorder_point_percentage: number;
  safety_stock_days: number;
}

const InventorySettings: React.FC = () => {
  const [itemMasters, setItemMasters] = useState<ItemMaster[]>([]);
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ItemMaster>>({});
  
  // New state for default settings
  const [defaultSettings, setDefaultSettings] = useState<DefaultSettings>({
    minimum_stock_percentage: 10,
    reorder_point_percentage: 20,
    safety_stock_days: 7
  });

  useEffect(() => {
    loadInventoryData();
    loadDefaultSettings();
  }, []);

  const loadDefaultSettings = async () => {
    try {

      const { data, error } = await supabase
        .from('inventory_settings')
        .select('setting_name, setting_value')
        .in('setting_name', ['minimum_stock_percentage', 'reorder_point_percentage', 'safety_stock_days'])
        .eq('is_active', true);

      if (error) {
        
        toast.error('Database access error. Using local storage fallback.');
        
        // Fallback to localStorage
        const savedSettings = localStorage.getItem('inventory_default_settings');
        if (savedSettings) {
          setDefaultSettings(JSON.parse(savedSettings));
          
        }
        return;
      }

      if (data && data.length > 0) {

        // Convert array of settings to object
        const settings: DefaultSettings = {
          minimum_stock_percentage: 10,
          reorder_point_percentage: 20,
          safety_stock_days: 7
        };

        data.forEach(setting => {
          if (setting.setting_name === 'minimum_stock_percentage') {
            settings.minimum_stock_percentage = Number(setting.setting_value);
          } else if (setting.setting_name === 'reorder_point_percentage') {
            settings.reorder_point_percentage = Number(setting.setting_value);
          } else if (setting.setting_name === 'safety_stock_days') {
            settings.safety_stock_days = Number(setting.setting_value);
          }
        });

        setDefaultSettings(settings);
      } else {
        
        // Fallback to localStorage
        const savedSettings = localStorage.getItem('inventory_default_settings');
        if (savedSettings) {
          setDefaultSettings(JSON.parse(savedSettings));
        }
      }
    } catch (error) {
      
      // Fallback to localStorage
      const savedSettings = localStorage.getItem('inventory_default_settings');
      if (savedSettings) {
        setDefaultSettings(JSON.parse(savedSettings));
      }
    }
  };

  const loadInventoryData = async () => {
    setIsLoading(true);
    try {
      // Load item masters
      const { data: items, error: itemsError } = await supabase
        .from('item_masters')
        .select('*')
        .order('nomenclature');

      if (itemsError) {
        
        toast.error('Failed to load item masters');
      } else {
        setItemMasters(items || []);
      }

      // Calculate stock summary from available data
      const summary: StockSummary = {
        total_items: items?.length || 0,
        low_stock_items: items?.filter(item => (item.minimum_stock_level || 0) > 0).length || 0,
        out_of_stock_items: 0, // Would need stock_transactions to calculate
        total_value: 0 // Would need pricing data
      };
      setStockSummary(summary);

    } catch (error) {
      
      toast.error('Failed to load inventory data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditItem = (item: ItemMaster) => {
    setEditingItem(item.id);
    setFormData({
      minimum_stock_level: item.minimum_stock_level,
      maximum_stock_level: item.maximum_stock_level,
      reorder_point: item.reorder_point
    });
  };

  const handleSaveItem = async (itemId: string) => {
    setIsSaving(true);
    try {

      // Validate form data
      const updateData = {
        minimum_stock_level: formData.minimum_stock_level || null,
        maximum_stock_level: formData.maximum_stock_level || null,
        reorder_point: formData.reorder_point || null
      };

      const { error } = await supabase
        .from('item_masters')
        .update(updateData)
        .eq('id', itemId);

      if (error) {

        // Check if it's a column issue
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          toast.error('Database column not found. Please check table structure.');
        } else if (error.code === '23502') {
          toast.error('Required field is missing. Please fill all fields.');
        } else if (error.code === '22P02') {
          toast.error('Invalid data format. Please check your inputs.');
        } else {
          toast.error(`Failed to update item: ${error.message}`);
        }
      } else {
        
        toast.success('Item settings updated successfully');
        setEditingItem(null);
        setFormData({});
        loadInventoryData();
      }
    } catch (error) {
      
      toast.error('Failed to save item settings');
    } finally {
      setIsSaving(false);
    }
  };

  const saveDefaultSettings = async () => {
    setIsSaving(true);
    try {
      // First save to localStorage as immediate fallback
      localStorage.setItem('inventory_default_settings', JSON.stringify(defaultSettings));

      // Try to save to database

      // Prepare the settings data for upsert
      const settingsToUpsert = [
        {
          setting_name: 'minimum_stock_percentage',
          setting_value: defaultSettings.minimum_stock_percentage,
          setting_type: 'stock_defaults',
          description: 'Default percentage for minimum stock level alerts',
          min_value: 0,
          max_value: 100,
          is_active: true,
          updated_at: new Date().toISOString(),
          updated_by: 'system'
        },
        {
          setting_name: 'reorder_point_percentage',
          setting_value: defaultSettings.reorder_point_percentage,
          setting_type: 'stock_defaults',
          description: 'Default percentage for reorder point triggers',
          min_value: 0,
          max_value: 100,
          is_active: true,
          updated_at: new Date().toISOString(),
          updated_by: 'system'
        },
        {
          setting_name: 'safety_stock_days',
          setting_value: defaultSettings.safety_stock_days,
          setting_type: 'stock_defaults',
          description: 'Default number of days for safety stock buffer',
          min_value: 0,
          max_value: 365,
          is_active: true,
          updated_at: new Date().toISOString(),
          updated_by: 'system'
        }
      ];

      // Use upsert to insert or update each setting
      const { error: upsertError } = await supabase
        .from('inventory_settings')
        .upsert(settingsToUpsert, {
          onConflict: 'setting_name',
          ignoreDuplicates: false
        });

      if (upsertError) {
        
        toast.success('Settings saved locally (database sync failed)');
      } else {
        
        toast.success('Settings saved successfully to database');
      }
    } catch (error) {
      
      toast.success('Settings saved locally (database unavailable)');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setFormData({});
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Settings</h1>
          <p className="text-muted-foreground">
            Configure stock levels and inventory parameters for items
          </p>
        </div>
        <Button onClick={loadInventoryData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stock-levels">Stock Levels</TabsTrigger>
          <TabsTrigger value="item-settings">Item Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stockSummary?.total_items || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Configured item masters
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">With Min Stock</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stockSummary?.low_stock_items || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Items with minimum stock levels set
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(itemMasters.map(item => item.category_name)).size}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unique categories
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">✅</div>
                <p className="text-xs text-muted-foreground">
                  Connected to Supabase
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stock Levels Tab */}
        <TabsContent value="stock-levels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Level Configuration</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure minimum, maximum, and reorder points for inventory items
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Default Minimum Stock %</Label>
                    <Input 
                      placeholder="10" 
                      type="number" 
                      value={defaultSettings.minimum_stock_percentage}
                      onChange={(e) => setDefaultSettings({
                        ...defaultSettings,
                        minimum_stock_percentage: parseInt(e.target.value) || 0
                      })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Percentage of max stock to trigger low stock alert
                    </p>
                  </div>
                  <div>
                    <Label>Default Reorder Point %</Label>
                    <Input 
                      placeholder="20" 
                      type="number" 
                      value={defaultSettings.reorder_point_percentage}
                      onChange={(e) => setDefaultSettings({
                        ...defaultSettings,
                        reorder_point_percentage: parseInt(e.target.value) || 0
                      })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Percentage of max stock to trigger reorder
                    </p>
                  </div>
                  <div>
                    <Label>Safety Stock Days</Label>
                    <Input 
                      placeholder="7" 
                      type="number" 
                      value={defaultSettings.safety_stock_days}
                      onChange={(e) => setDefaultSettings({
                        ...defaultSettings,
                        safety_stock_days: parseInt(e.target.value) || 0
                      })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Days of stock to maintain as safety buffer
                    </p>
                  </div>
                </div>
                <Button onClick={saveDefaultSettings} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Default Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Item Settings Tab */}
        <TabsContent value="item-settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Individual Item Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure stock levels for individual items
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {itemMasters.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.nomenclature}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.category_name} → {item.sub_category_name}
                      </p>
                      
                      {editingItem === item.id ? (
                        <div className="grid gap-4 md:grid-cols-3 mt-2">
                          <div>
                            <Label className="text-xs">Min Stock</Label>
                            <Input
                              type="number"
                              value={formData.minimum_stock_level || ''}
                              onChange={(e) => setFormData({...formData, minimum_stock_level: parseInt(e.target.value) || 0})}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Max Stock</Label>
                            <Input
                              type="number"
                              value={formData.maximum_stock_level || ''}
                              onChange={(e) => setFormData({...formData, maximum_stock_level: parseInt(e.target.value) || 0})}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Reorder Point</Label>
                            <Input
                              type="number"
                              value={formData.reorder_point || ''}
                              onChange={(e) => setFormData({...formData, reorder_point: parseInt(e.target.value) || 0})}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-4 mt-2 text-sm">
                          <span>Min: {item.minimum_stock_level || 0}</span>
                          <span>Max: {item.maximum_stock_level || 0}</span>
                          <span>Reorder: {item.reorder_point || 0}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {editingItem === item.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleSaveItem(item.id)}
                            disabled={isSaving}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditItem(item)}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {itemMasters.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No Items Found</h3>
                    <p className="text-muted-foreground">
                      No item masters are configured in the system.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventorySettings;
