"""Unit tests for Spoolman service.

These tests specifically target the sync_ams_tray method's disable_weight_sync
functionality that controls whether remaining_weight is updated.
"""

from unittest.mock import AsyncMock, patch

import pytest

from backend.app.services.spoolman import AMSTray, SpoolmanClient


class TestSpoolmanClient:
    """Tests for SpoolmanClient class."""

    @pytest.fixture
    def client(self):
        """Create a SpoolmanClient instance."""
        return SpoolmanClient("http://localhost:7912")

    @pytest.fixture
    def sample_tray(self):
        """Create a sample AMSTray for testing."""
        return AMSTray(
            ams_id=0,
            tray_id=0,
            tray_type="PLA",
            tray_sub_brands="PLA Basic",
            tray_color="FF0000FF",
            remain=50,
            tag_uid="",
            tray_uuid="A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
            tray_info_idx="GFA00",
            tray_weight=1000,
        )

    @pytest.fixture
    def existing_spool(self):
        """Create a mock existing spool response."""
        return {
            "id": 42,
            "remaining_weight": 800,
            "extra": {"tag": '"A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4"'},
            "filament": {"id": 1, "name": "PLA Red", "material": "PLA"},
        }

    @pytest.fixture
    def mock_filament(self):
        """Create a mock filament response."""
        return {"id": 1, "name": "PLA Basic", "material": "PLA"}

    # ========================================================================
    # Tests for sync_ams_tray with disable_weight_sync
    # ========================================================================

    @pytest.mark.asyncio
    async def test_sync_ams_tray_updates_weight_by_default(self, client, sample_tray, existing_spool):
        """Verify sync_ams_tray updates remaining_weight by default."""
        with (
            patch.object(client, "find_spool_by_tag", AsyncMock(return_value=existing_spool)),
            patch.object(client, "update_spool", AsyncMock(return_value={"id": 42})) as mock_update,
        ):
            await client.sync_ams_tray(sample_tray, "TestPrinter")

            mock_update.assert_called_once()
            call_kwargs = mock_update.call_args.kwargs
            assert "remaining_weight" in call_kwargs
            assert call_kwargs["remaining_weight"] == 500.0  # 50% of 1000g
            assert "location" in call_kwargs

    @pytest.mark.asyncio
    async def test_sync_ams_tray_skips_weight_when_disabled(self, client, sample_tray, existing_spool):
        """Verify sync_ams_tray skips remaining_weight when disable_weight_sync=True."""
        with (
            patch.object(client, "find_spool_by_tag", AsyncMock(return_value=existing_spool)),
            patch.object(client, "update_spool", AsyncMock(return_value={"id": 42})) as mock_update,
        ):
            await client.sync_ams_tray(sample_tray, "TestPrinter", disable_weight_sync=True)

            mock_update.assert_called_once()
            call_kwargs = mock_update.call_args.kwargs
            # remaining_weight should be None (not updated)
            assert call_kwargs.get("remaining_weight") is None
            # location should still be updated
            assert "location" in call_kwargs
            assert "TestPrinter" in call_kwargs["location"]

    @pytest.mark.asyncio
    async def test_sync_ams_tray_new_spool_always_includes_weight(self, client, sample_tray, mock_filament):
        """Verify new spool creation always includes remaining_weight even when disabled."""
        with (
            patch.object(client, "find_spool_by_tag", AsyncMock(return_value=None)),
            patch.object(client, "_find_or_create_filament", AsyncMock(return_value=mock_filament)),
            patch.object(client, "create_spool", AsyncMock(return_value={"id": 99})) as mock_create,
        ):
            await client.sync_ams_tray(sample_tray, "TestPrinter", disable_weight_sync=True)

            mock_create.assert_called_once()
            call_kwargs = mock_create.call_args.kwargs
            # New spools should ALWAYS include remaining_weight
            assert "remaining_weight" in call_kwargs
            assert call_kwargs["remaining_weight"] == 500.0  # 50% of 1000g

    @pytest.mark.asyncio
    async def test_sync_ams_tray_location_format(self, client, sample_tray, existing_spool):
        """Verify location format is correct when updating spool."""
        with (
            patch.object(client, "find_spool_by_tag", AsyncMock(return_value=existing_spool)),
            patch.object(client, "update_spool", AsyncMock(return_value={"id": 42})) as mock_update,
        ):
            await client.sync_ams_tray(sample_tray, "My Printer", disable_weight_sync=True)

            call_kwargs = mock_update.call_args.kwargs
            # Location should follow pattern: "PrinterName - AMS A1"
            assert "location" in call_kwargs
            assert "My Printer" in call_kwargs["location"]
            assert "AMS" in call_kwargs["location"]

    @pytest.mark.asyncio
    async def test_sync_ams_tray_skips_non_bambu_spool(self, client):
        """Verify non-Bambu Lab spools are skipped."""
        # Third-party spool without proper identifiers
        tray = AMSTray(
            ams_id=0,
            tray_id=0,
            tray_type="PLA",
            tray_sub_brands="Third Party PLA",
            tray_color="FF0000FF",
            remain=50,
            tag_uid="",
            tray_uuid="",
            tray_info_idx="",  # No Bambu Lab preset ID
            tray_weight=1000,
        )

        result = await client.sync_ams_tray(tray, "TestPrinter")
        assert result is None

    @pytest.mark.asyncio
    async def test_sync_ams_tray_weight_calculation(self, client, existing_spool):
        """Verify remaining weight is calculated correctly for various percentages."""
        test_cases = [
            (100, 1000, 1000.0),  # Full spool
            (50, 1000, 500.0),  # Half spool
            (25, 1000, 250.0),  # Quarter spool
            (0, 1000, 0.0),  # Empty spool
            (75, 500, 375.0),  # Different spool weight
        ]

        for remain, weight, expected in test_cases:
            tray = AMSTray(
                ams_id=0,
                tray_id=0,
                tray_type="PLA",
                tray_sub_brands="PLA Basic",
                tray_color="FF0000FF",
                remain=remain,
                tag_uid="",
                tray_uuid="A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
                tray_info_idx="GFA00",
                tray_weight=weight,
            )

            with (
                patch.object(client, "find_spool_by_tag", AsyncMock(return_value=existing_spool)),
                patch.object(client, "update_spool", AsyncMock(return_value={"id": 42})) as mock_update,
            ):
                await client.sync_ams_tray(tray, "TestPrinter", disable_weight_sync=False)

                call_kwargs = mock_update.call_args.kwargs
                assert call_kwargs["remaining_weight"] == expected, (
                    f"Expected {expected}g for {remain}% of {weight}g, got {call_kwargs['remaining_weight']}"
                )

    # ========================================================================
    # Tests for caching functionality
    # ========================================================================

    @pytest.mark.asyncio
    async def test_find_spool_by_tag_with_cached_spools(self, client):
        """Verify find_spool_by_tag uses cached spools when provided (no API call)."""
        cached = [
            {"id": 1, "extra": {"tag": '"ABC123"'}},
            {"id": 2, "extra": {"tag": '"XYZ789"'}},
        ]

        with patch.object(client, "get_spools", AsyncMock()) as mock_get:
            result = await client.find_spool_by_tag("ABC123", cached_spools=cached)
            assert result["id"] == 1
            mock_get.assert_not_called()  # Should NOT call get_spools

    @pytest.mark.asyncio
    async def test_find_spool_by_tag_without_cached_spools(self, client):
        """Verify find_spool_by_tag fetches spools when cache not provided."""
        mock_spools = [{"id": 1, "extra": {"tag": '"ABC123"'}}]

        with patch.object(client, "get_spools", AsyncMock(return_value=mock_spools)) as mock_get:
            result = await client.find_spool_by_tag("ABC123")
            assert result["id"] == 1
            mock_get.assert_called_once()  # Should call get_spools

    @pytest.mark.asyncio
    async def test_find_spools_by_location_prefix_with_cached_spools(self, client):
        """Verify find_spools_by_location_prefix uses cached spools when provided."""
        cached = [
            {"id": 1, "location": "Printer1 - AMS A1"},
            {"id": 2, "location": "Printer2 - AMS A1"},
            {"id": 3, "location": "Printer1 - AMS A2"},
        ]

        with patch.object(client, "get_spools", AsyncMock()) as mock_get:
            result = await client.find_spools_by_location_prefix("Printer1 - ", cached_spools=cached)
            assert len(result) == 2
            assert result[0]["id"] == 1
            assert result[1]["id"] == 3
            mock_get.assert_not_called()  # Should NOT call get_spools

    @pytest.mark.asyncio
    async def test_sync_ams_tray_with_cached_spools(self, client, sample_tray, existing_spool):
        """Verify sync_ams_tray passes cached_spools to find_spool_by_tag."""
        cached = [existing_spool]

        with (
            patch.object(client, "get_spools", AsyncMock()) as mock_get,
            patch.object(client, "update_spool", AsyncMock(return_value={"id": 42})),
        ):
            await client.sync_ams_tray(sample_tray, "TestPrinter", cached_spools=cached)
            mock_get.assert_not_called()  # Should NOT call get_spools

    @pytest.mark.asyncio
    async def test_clear_location_for_removed_spools_with_cached_spools(self, client):
        """Verify clear_location_for_removed_spools uses cached spools."""
        cached = [
            {"id": 1, "location": "Printer1 - AMS A1", "extra": {"tag": '"TAG1"'}},
            {"id": 2, "location": "Printer1 - AMS A2", "extra": {"tag": '"TAG2"'}},
            {"id": 3, "location": "Printer1 - AMS A3", "extra": {"tag": '"TAG3"'}},
        ]
        current_tags = {"TAG1", "TAG2"}  # TAG3 was removed

        with (
            patch.object(client, "get_spools", AsyncMock()) as mock_get,
            patch.object(client, "update_spool", AsyncMock(return_value={"id": 3})) as mock_update,
        ):
            cleared = await client.clear_location_for_removed_spools("Printer1", current_tags, cached_spools=cached)
            assert cleared == 1
            mock_get.assert_not_called()  # Should NOT call get_spools
            mock_update.assert_called_once()
            # Verify it cleared TAG3 (not in current_tags)
            call_kwargs = mock_update.call_args.kwargs
            assert call_kwargs["spool_id"] == 3
            assert call_kwargs.get("clear_location") is True
