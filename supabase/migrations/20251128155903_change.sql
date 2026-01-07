-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_modified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Project settings
    resolution_width INTEGER DEFAULT 1080,
    resolution_height INTEGER DEFAULT 1920,
    fps INTEGER DEFAULT 30,
    aspect_ratio TEXT DEFAULT '9:16',
    
    -- Export settings (stored as JSONB)
    export_settings JSONB DEFAULT '{
        "resolution": "1080p",
        "quality": "high",
        "speed": "fastest",
        "fps": 30,
        "format": "mp4",
        "includeSubtitles": false
    }'::jsonb,
    
    -- Timeline settings
    "current_time" REAL DEFAULT 0,
    duration REAL DEFAULT 0,
    zoom_level REAL DEFAULT 1,
    timeline_zoom INTEGER DEFAULT 100,
    enable_marker_tracking BOOLEAN DEFAULT true,
    
    -- Active element tracking
    active_section TEXT DEFAULT 'media',
    active_element TEXT,
    active_element_index INTEGER DEFAULT 0,
    
    UNIQUE(user_id, id)
);

-- Create project_items table for media files and text elements
CREATE TABLE IF NOT EXISTS project_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('media', 'text')),
    
    -- Common fields
    position_start REAL NOT NULL,
    position_end REAL NOT NULL,
    include_in_merge BOOLEAN DEFAULT true,
    z_index INTEGER DEFAULT 0,
    
    -- Media-specific fields (stored as JSONB)
    media_data JSONB,
    -- Structure: {
    --   "fileId": "uuid",
    --   "fileName": "string",
    --   "type": "video|audio|image|unknown",
    --   "startTime": number,
    --   "endTime": number,
    --   "playbackSpeed": number,
    --   "volume": number,
    --   "x": number,
    --   "y": number,
    --   "width": number,
    --   "height": number,
    --   "rotation": number,
    --   "opacity": number,
    --   "crop": {...},
    --   "aspectRatioFit": "...",
    --   "zoom": number,
    --   "originalWidth": number,
    --   "originalHeight": number,
    --   "isPlaceholder": boolean,
    --   "placeholderType": "..."
    -- }
    
    -- Text-specific fields (stored as JSONB)
    text_data JSONB,
    -- Structure: {
    --   "text": "string",
    --   "x": number,
    --   "y": number,
    --   "width": number,
    --   "height": number,
    --   "font": "string",
    --   "fontSize": number,
    --   "color": "string",
    --   "backgroundColor": "string",
    --   "align": "left|center|right",
    --   "opacity": number,
    --   "rotation": number,
    --   "fadeInDuration": number,
    --   "fadeOutDuration": number,
    --   "animation": "..."
    -- }
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_last_modified ON projects(last_modified DESC);
CREATE INDEX IF NOT EXISTS idx_project_items_project_id ON project_items(project_id);
CREATE INDEX IF NOT EXISTS idx_project_items_type ON project_items(item_type);

-- Function to update last_modified timestamp
CREATE OR REPLACE FUNCTION update_project_last_modified()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE projects
    SET last_modified = NOW()
    WHERE id = NEW.project_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_modified when project_items change
CREATE TRIGGER update_project_modified_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON project_items
    FOR EACH ROW
    EXECUTE FUNCTION update_project_last_modified();

